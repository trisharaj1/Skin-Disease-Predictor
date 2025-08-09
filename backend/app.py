import os
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'  # Suppress TensorFlow warnings
os.environ['CUDA_VISIBLE_DEVICES'] = '-1'  # Disable GPU and force TensorFlow to use CPU

from flask import Flask, jsonify, request, session
from flask_cors import CORS
from pymongo import MongoClient
from dotenv import load_dotenv
import base64
import numpy as np
from PIL import Image
import io
from tensorflow.keras.models import load_model
from authentication import Authentication

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)
app.secret_key = os.environ.get('SECRET_KEY')

# Configure MongoDB client with SSL
MONGO_URI = os.getenv('MONGO_URI')
client = MongoClient(MONGO_URI, tls=True, tlsAllowInvalidCertificates=True)

# Specify the database name
db_name = os.getenv('DB_NAME', 'test')
db = client[db_name]
users = db.users

@app.route("/")
def index():
    return jsonify({'message': 'Hello World'}), 200

@app.route('/register', methods=['POST'])
def register():
    return Authentication.register_user(users)

@app.route('/login', methods=['POST'])
def login():
    return Authentication.login_user(users)

@app.route('/upload', methods=['POST'])
def upload():
    try:
        if 'user_id' not in session:
            return jsonify({'error': 'User not logged in'}), 401

        user_id = session['user_id']
        data = request.get_json()
        image_data = data['image']
        # Decode the base64 string
        image_bytes = base64.b64decode(image_data.split(',')[1])

        # Load the model from the .h5 file
        model_file_path = 'model/model.h5'
        model = load_model(model_file_path)

        # Preprocess the image
        image = Image.open(io.BytesIO(image_bytes)).convert('RGB')  # Convert to RGB
        image = image.resize((180, 180))  # Resize to the expected input size
        image_array = np.array(image) / 255.0  # Normalize the image
        image_array = np.expand_dims(image_array, axis=0)  # Add batch dimension

        # Feed the image to the model
        predictions = model.predict(image_array)

        # Convert predictions to percentages
        percentages = predictions[0] * 100

        # Format the results
        data_categories = ['Acne and Rosacea Photos', 'Actinic Keratosis Basal Cell Carcinoma and other Malignant Lesions', 'Atopic Dermatitis Photos', 'Bullous Disease Photos', 'Cellulitis Impetigo and other Bacterial Infections', 'Eczema Photos', 'Exanthems and Drug Eruptions', 'Hair Loss Photos Alopecia and other Hair Diseases', 'Herpes HPV and other STDs Photos', 'Light Diseases and Disorders of Pigmentation', 'Lupus and other Connective Tissue diseases', 'Melanoma Skin Cancer Nevi and Moles', 'Nail Fungus and other Nail Disease', 'Poison Ivy Photos and other Contact Dermatitis', 'Psoriasis pictures Lichen Planus and related diseases', 'Scabies Lyme Disease and other Infestations and Bites', 'Seborrheic Keratoses and other Benign Tumors', 'Systemic Disease', 'Tinea Ringworm Candidiasis and other Fungal Infections', 'Urticaria Hives', 'Vascular Tumors', 'Vasculitis Photos', 'Warts Molluscum and other Viral Infections']
        results = {category: percentage for category, percentage in zip(data_categories, percentages)}

        # Get the top 5 highest predictions
        top_5_results = sorted(results.items(), key=lambda item: item[1], reverse=True)[:5]
        top_5_results = [{'key': category, 'probability': f"{percentage:.2f}%"} for category, percentage in top_5_results]

        # Create an entry for the image and its results
        image_entry = {
            'image': image_data,
            'results': top_5_results
        }

        # Store the image and results in the user's document
        users.update_one(
            {'_id': user_id},
            {'$push': {'images': image_entry}}
        )

        return jsonify({'message': 'Image uploaded and processed successfully', 'predictions': top_5_results}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/check_login', methods=['GET'])
def check_login():
    if 'user_id' in session:
        return jsonify({'logged_in': True}), 200
    else:
        return jsonify({'logged_in': False}), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)