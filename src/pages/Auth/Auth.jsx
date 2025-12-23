import { useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import apiClient from '../../apiClient';
import { Link, useNavigate } from 'react-router-dom';
import { useUser } from '../../context/UserContextApi';
import { FaUser, FaEnvelope, FaLock, FaCamera, FaWifi } from 'react-icons/fa'; // ✅ ADD FaWifi

const AuthForm = ({ type }) => {
    const { updateUser } = useUser();
    const navigate = useNavigate();
    const [showDisclaimer, setShowDisclaimer] = useState(true);
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
            
            console.log('Auth response:', response.data);

            if (type === 'signup') {
                toast.success(response.data.message || 'Registration successful!');
                // Clear form
                setFormData({
                    fullname: '',
                    username: '',
                    email: '',
                    password: '',
                    confirmPassword: '',
                    gender: 'male',
                    profilepic: ''
                });
                setImagePreview(null);
                
                // Navigate to login after short delay
                setTimeout(() => {
                    navigate('/login');
                }, 1500);
            }

if (type === 'login') {
    const loginData = response.data;
    const userData = loginData.user;
    userData.token = loginData.token;

    console.log('Storing user data:', userData);

    // ✅ FIX 1: Store first
    localStorage.setItem("userData", JSON.stringify(userData));
    
    // ✅ FIX 2: Update context
    updateUser(userData);
    
    // ✅ FIX 3: Show success message
    toast.success(loginData.message || 'Login successful!');
    
    // ✅ FIX 4: Wait 1 second for everything to settle
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // ✅ FIX 5: Force reload instead of navigate
    window.location.href = '/';
}

        } catch (error) {
            console.error("Auth error:", error);
            
            // Handle different error types
            if (error.response) {
                // Server responded with error
                toast.error(error.response.data.message || 'Authentication failed!');
            } else if (error.request) {
                // Request was made but no response
                toast.error('Cannot connect to server. Please check your connection.');
            } else {
                // Something else happened
                toast.error('An error occurred. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (

         <>
        {/* ✅ ADD DISCLAIMER HERE */}
        {showDisclaimer && (
            <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <FaWifi className="text-yellow-500 text-3xl" />
                        <h2 className="text-xl font-bold text-gray-800">Network Notice</h2>
                    </div>
                    
                    <p className="text-gray-700 mb-4">
                        ⚠️ <strong>Demo Version:</strong> Video calls currently work best on the <strong>same WiFi network</strong>.
                    </p>
                    
                    <p className="text-sm text-gray-600 mb-4">
                        Cross-network calling will be improved in future updates.
                    </p>
                    
                    <button
                        onClick={() => setShowDisclaimer(false)}
                        className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-2 rounded-lg hover:opacity-90 transition"
                    >
                        I Understand
                    </button>
                </div>
            </div>
        )}

        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 to-purple-800 text-white p-4">
            <div className="bg-white text-gray-900 p-8 rounded-lg shadow-2xl w-full max-w-md">
                <h2 className="text-3xl font-extrabold text-center mb-6">
                    {type === 'signup' ? 'SignUp Video Meet' : 'Login Video Meet'}
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
                                    value={formData.fullname}
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
                                    value={formData.username}
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
                            value={formData.email}
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
                            value={formData.password}
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
                                    value={formData.confirmPassword}
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
                        className="w-full bg-gradient-to-r from-purple-500 to-purple-700 text-white py-2 rounded-lg hover:opacity-90 transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={loading}
                    >
                        {loading ? (
                            <span className="flex items-center justify-center">
                                <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Processing...
                            </span>
                        ) : (
                            type === 'signup' ? 'Sign Up' : 'Login'
                        )}
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
    </>  
    );
};

export default AuthForm;