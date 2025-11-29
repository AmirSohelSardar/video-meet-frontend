import { useState } from 'react';
import { FaUser, FaEnvelope, FaLock, FaCamera } from 'react-icons/fa';
import toast, { Toaster } from 'react-hot-toast';
import apiClient from '../../apiClient';
import { Link, useNavigate } from 'react-router-dom';
import { useUser } from '../../context/UserContextApi';

const AuthForm = ({ type }) => {
    const { updateUser } = useUser();
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        fullname: '',
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
        gender: 'male',
        profilepic: ''
    });
    const [loading, setLoading] = useState(false);
    const [imagePreview, setImagePreview] = useState(null);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validate file size (max 2MB)
            if (file.size > 2 * 1024 * 1024) {
                toast.error('Image size should be less than 2MB');
                return;
            }

            // Validate file type
            if (!file.type.startsWith('image/')) {
                toast.error('Please upload an image file');
                return;
            }

            // Convert to base64
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result);
                setFormData({ ...formData, profilepic: reader.result });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e) => {
    e.preventDefault();
    if (type === 'signup' && formData.password !== formData.confirmPassword) {
        toast.error('Passwords do not match!');
        return;
    }

    setLoading(true);

    try {
        const endpoint = type === 'signup' ? '/auth/signup' : '/auth/login';
        const response = await apiClient.post(endpoint, formData);
        toast.success(response.data.message || 'Success!');

        if (type === 'signup') {
            navigate('/login');
        }

        if (type === 'login') {
            const loginData = response.data;

            // ✔ Fetch real user from MongoDB
            const fullUser = await apiClient.get(`/user/${loginData._id}`);

            // ✔ Update React context
            updateUser(fullUser.data.user);

            // 🔥 Save correct MongoDB user to localStorage
            localStorage.setItem("userData", JSON.stringify(fullUser.data.user));


            navigate('/');
        }

    } catch (error) {
        console.error("Auth error:", error);
        toast.error(error.response?.data?.message || 'Something went wrong!');
    } finally {
        setLoading(false);
    }
};

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 to-purple-800 text-white p-4">
            <div className="bg-white text-gray-900 p-8 rounded-lg shadow-2xl w-full max-w-md">
                <h2 className="text-3xl font-extrabold text-center mb-6">
                    {type === 'signup' ? 'SignUp SlrTechCalls' : 'Login SlrTechCalls'}
                </h2>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    {type === 'signup' && (
                        <>
                            {/* Profile Picture Upload */}
                            <div className="flex flex-col items-center mb-4">
                                <div className="relative">
                                    <div className="w-24 h-24 rounded-full border-4 border-purple-500 overflow-hidden bg-gray-100 flex items-center justify-center">
                                        {imagePreview ? (
                                            <img 
                                                src={imagePreview} 
                                                alt="Preview" 
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <FaUser className="text-gray-400 text-4xl" />
                                        )}
                                    </div>
                                    <label 
                                        htmlFor="profilepic" 
                                        className="absolute bottom-0 right-0 bg-purple-500 text-white p-2 rounded-full cursor-pointer hover:bg-purple-600 transition"
                                    >
                                        <FaCamera />
                                        <input
                                            type="file"
                                            id="profilepic"
                                            name="profilepic"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={handleImageChange}
                                        />
                                    </label>
                                </div>
                                <p className="text-xs text-gray-500 mt-2">Upload profile picture (optional)</p>
                            </div>

                            <div className="flex items-center border rounded-lg p-2 bg-gray-100">
                                <FaUser className="text-purple-500 mr-2" />
                                <input
                                    type="text"
                                    name="fullname"
                                    placeholder="Full Name"
                                    className="w-full bg-transparent focus:outline-none"
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                            <div className="flex items-center border rounded-lg p-2 bg-gray-100">
                                <FaUser className="text-purple-500 mr-2" />
                                <input
                                    type="text"
                                    name="username"
                                    placeholder="Username (e.g., Jondo99)"
                                    className="w-full bg-transparent focus:outline-none"
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </>
                    )}
                    
                    <div className="flex items-center border rounded-lg p-2 bg-gray-100">
                        <FaEnvelope className="text-purple-500 mr-2" />
                        <input
                            type="email"
                            name="email"
                            placeholder="Email"
                            className="w-full bg-transparent focus:outline-none"
                            onChange={handleChange}
                            required
                        />
                    </div>
                    
                    <div className="flex items-center border rounded-lg p-2 bg-gray-100">
                        <FaLock className="text-purple-500 mr-2" />
                        <input
                            type="password"
                            name="password"
                            placeholder="Password"
                            className="w-full bg-transparent focus:outline-none"
                            onChange={handleChange}
                            required
                        />
                    </div>
                    
                    {type === 'signup' && (
                        <>
                            <div className="flex items-center border rounded-lg p-2 bg-gray-100">
                                <FaLock className="text-purple-500 mr-2" />
                                <input
                                    type="password"
                                    name="confirmPassword"
                                    placeholder="Confirm Password"
                                    className="w-full bg-transparent focus:outline-none"
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                            
                            <div className="flex items-center space-x-4">
                                <label className="flex items-center">
                                    <input
                                        type="radio"
                                        name="gender"
                                        value="male"
                                        checked={formData.gender === 'male'}
                                        onChange={handleChange}
                                        className="mr-2"
                                    />
                                    Male
                                </label>
                                <label className="flex items-center">
                                    <input
                                        type="radio"
                                        name="gender"
                                        value="female"
                                        checked={formData.gender === 'female'}
                                        onChange={handleChange}
                                        className="mr-2"
                                    />
                                    Female
                                </label>
                            </div>
                        </>
                    )}
                    
                    <button
                        type="submit"
                        className="w-full bg-gradient-to-r from-purple-500 to-purple-700 text-white py-2 rounded-lg hover:opacity-90 transition duration-300"
                        disabled={loading}
                    >
                        {loading ? 'Loading...' : type === 'signup' ? 'Sign Up' : 'Login'}
                    </button>
                </form>
                
                <p className="text-center text-sm mt-4">
                    {type === 'signup' ? (
                        <>
                            Already have an account?{' '}
                            <Link to="/login">
                                <span className="underline text-purple-500 cursor-pointer">Login</span>
                            </Link>
                        </>
                    ) : (
                        <>
                            Don't have an account?{' '}
                            <Link to="/signup">
                                <span className="underline text-purple-500 cursor-pointer">Register</span>
                            </Link>
                        </>
                    )}
                </p>
            </div>
            <Toaster position="top-center" />
        </div>
    );
};

export default AuthForm;