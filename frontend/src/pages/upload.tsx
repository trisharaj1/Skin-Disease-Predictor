import { useState } from 'react';
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import Image from 'next/image';
import '../styles/globals.css';
import axios from "axios";
import { useRouter } from 'next/router';
import { useEffect } from 'react';

const Upload: React.FC = () => {
    const [image, setImage] = useState<File | null>(null);
    const router = useRouter();
    const [loggedIn, setLoggedIn] = useState(Boolean);
    const [predictionData, setPredictionData] = useState<{ key: string, probability: string }[]>([]);
    const [aiResponse, setAiResponse] = useState([]);

    useEffect(() => {
        // Check if the user is logged in
        axios.get('http://localhost:5000/check_login', { withCredentials: true })
            .then(response => {
                if (response.data.logged_in) {
                    setLoggedIn(true);
                } else {
                    router.push('/login');
                }
            })
            .catch(error => {
                console.error('Error checking login status:', error);
                router.push('/login');
            });
    }, [router]);



    const toBase64 = (file: File) =>
        new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = (error) => reject(error);
        });


    const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            const selectedImage = event.target.files[0];
            setImage(selectedImage);

            try {
                const dataImage = await toBase64(selectedImage);

                // Send the Base64 string to the backend
                axios.post('http://localhost:5000/upload', {
                    image: dataImage
                }, { withCredentials: true }).then(response => {
                    console.log('Image uploaded successfully:', response.data.predictions);
                    setPredictionData(response.data.predictions);
                    callAiToGenerateTreatments();
                }).catch(error => {
                    console.error('Error uploading image:', error);
                    if (error.response) {
                        // The request was made and the server responded with a status code
                        // that falls out of the range of 2xx
                        console.error('Response data:', error.response.data);
                        console.error('Response status:', error.response.status);
                        console.error('Response headers:', error.response.headers);
                    } else if (error.request) {
                        // The request was made but no response was received
                        console.error('Request data:', error.request);
                    } else {
                        // Something happened in setting up the request that triggered an Error
                        console.error('Error message:', error.message);
                    }
                });
            } catch (error) {
                console.error('Error converting image to base64:', error);
            }
        }
    };

    const callAiToGenerateTreatments = async () => {
        axios.post("http://localhost:5000/generateTreatments").then(response => {
            setAiResponse(response.data);
        }).catch(error => {
            console.error("Error: ", error);
        })
    }


    return (
        <div className="m-0 p-0 min-h-screen flex flex-col justify-between h-auto">
            <NavBar />

            {image ? (
                <div className='flex flex-row w-full h-auto'>
                    {/* LHS */}
                    <div className='flex flex-row items-center justify-center w-1/2 h-auto py-10'>
                        <div className='flex flex-col h-auto w-3/4 items-center mx-10'>
                            <h1 className="text-3xl font-bold mb-4">Upload an Image</h1>

                            <form className="max-w-lg mx-auto">
                                <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white" htmlFor="user_avatar">Upload file</label>
                                <input className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 dark:text-gray-400 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400" aria-describedby="user_avatar_help" id="user_avatar" type="file" />
                                <div className="mt-1 text-sm text-gray-500 dark:text-gray-300" id="user_avatar_help">A profile picture is useful to confirm your are logged into your account</div>
                            </form>
                            {image && (
                                <div className="flex flex-row items-start justify-center w-full max-w-6xl">
                                    {/* Uploaded Image */}
                                    <div className="flex-shrink-0 w-full h-auto p-4 border border-gray-300 rounded-lg bg-white shadow-lg">
                                        <Image src={URL.createObjectURL(image)} alt="Uploaded" className="w-full h-full object-contain rounded-lg" width={800} height={800} />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    {/* RHS */}
                    <div className='flex flex-col h-auto w-1/2 items-center justify-center'>
                        <div className="w-full">
                            <div className="p-5 border border-gray-300 rounded-lg bg-white shadow-lg w-full h-auto">
                                <h2 className="text-xl font-bold mb-4">Disease Probability</h2>
                                {Array.isArray(predictionData) && predictionData.map((prediction, index) => (
                                    <li key={index} className="mb-1">
                                        {prediction.key}: {prediction.probability}
                                        <div className="flex justify-between mb-1">
                                            <span className="text-base font-medium text-blue-700 dark:text-white">{prediction.key}</span>
                                            <span className="text-sm font-medium text-blue-700 dark:text-white">{prediction.probability}</span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                                            <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: prediction.probability }}></div>
                                        </div>
                                    </li>
                                ))}
                            </div>
                            <div className="p-5 w-full mt-8 flex justify-center h-auto">
                                <div className="w-full p-4 border border-gray-300 rounded-lg bg-white shadow-lg">
                                    <h2 className="text-xl font-bold mb-2">Treatments</h2>
                                    <ul className="list-disc list-inside">
                                        <p>{aiResponse}</p>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className='flex flex-col w-full h-auto justify-center items-center'>
                    <h1 className="text-3xl font-bold mb-4">Upload an Image</h1>
                    <input type="file" onChange={handleImageUpload} className="mb-4" />
                </div>
            )}

            <br />
            <br />
            <Footer />
        </div>
    )
}

export default Upload;
