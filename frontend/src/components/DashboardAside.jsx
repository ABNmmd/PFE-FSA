import React, { useState, useEffect } from 'react'
import { RxDashboard } from "react-icons/rx";
import { MdOutlineExpandMore, MdArrowForwardIos } from "react-icons/md";
import { CgMenu, CgMenuMotion } from "react-icons/cg";
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function DashboardAside({ arr = [] }) {
    const [isOpen, setIsOpen] = useState(false);
    const [isSidebarVisible, setIsSidebarVisible] = useState(() => {
        // Get the sidebar state from local storage, or default to true
        const storedState = localStorage.getItem('sidebarVisible');
        return storedState === null ? true : storedState === 'true';
    });

    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const toggleSidebar = () => {
        const newState = !isSidebarVisible;
        setIsSidebarVisible(newState);
        localStorage.setItem('sidebarVisible', newState.toString()); // Store the new state in local storage
    }

    const handleLogout = () => {
        logout();
        navigate('/login');
    }

    return (
        <aside className={`left-0 top-0 bg-white h-screen w-fit py-4 px-2 shadow-md flex ${!isSidebarVisible && "items-center"} flex-col transition-all duration-300 ease-in-out ${isSidebarVisible ? 'w-64' : 'w-16'}`}>
            <div className={`mb-10 ${isSidebarVisible && "flex justify-between items-center"} p-2`}>
                {isSidebarVisible && <h1 className="text-2xl font-bold">Plagiat</h1>}
                <button className='text-2xl text-gray-600 hover:text-gray-800 transition-colors cursor-pointer' onClick={toggleSidebar} aria-label={isSidebarVisible ? "Hide sidebar" : "Show sidebar"}>
                    {isSidebarVisible ? <CgMenuMotion /> : <CgMenu />}
                </button>
            </div>
            <nav className={`flex flex-col items-center flex-grow `}>
                <ul className={`flex-grow space-y-4 mb-auto ${isSidebarVisible && "w-full"}`}>
                    <li className="transition-transform duration-200 transform hover:bg-blue-700 rounded-md group">
                        <Link to="/dashboard" aria-label="Dashboard"
                            className={`${isSidebarVisible && "flex items-center text-base"} text-lg block text-gray-500 w-full p-2 hover:text-white transition-colors focus:outline-none`}
                        >
                            <RxDashboard className="" />
                            {isSidebarVisible && <span className="ml-6 capitalize">Dashboard</span>}
                        </Link>
                    </li>
                    {
                        arr.map((item) => (
                            <li key={item.id}
                                className="transition-transform duration-200 transform hover:bg-blue-700 rounded-md group"
                            >
                                <button
                                    onClick={() => {}}
                                    className={`${isSidebarVisible && "flex items-center justify-between text-base"} text-lg block w-full p-2 text-gray-400 hover:text-white transition-colors focus:outline-none cursor-pointer`}
                                >
                                    <div className={isSidebarVisible && "flex items-center"}>
                                        {item.icon}
                                        {isSidebarVisible && <span className="ml-6 capitalize">{item.name}</span>}
                                    </div>
                                    {isSidebarVisible && <MdArrowForwardIos className={`text-sm transition-transform duration-200 group-hover:transform group-hover:translate-x-1`} />}
                                </button>
                            </li>
                        )
                        )
                    }
                </ul>
                <div className="relative flex-grow-0 flex items-center mt-4">
                    <img src="https://i.pravatar.cc/100" alt="User Avatar" className="w-9 h-9 rounded-full object-cover" />
                    {isSidebarVisible && (
                        <>
                            <div className="ml-4">
                                <p className="text-gray-800 text-sm">{user?.username}</p>
                                <p className="text-gray-600 text-sm">{user?.email}</p>
                            </div>
                            <button
                                aria-label="Expand user options"
                                className="ml-4 font-bold text-xl text-gray-600 hover:text-gray-800 transition-colors duration-200 cursor-pointer"
                                onClick={() => setIsOpen(!isOpen)}
                            >
                                <MdOutlineExpandMore />
                            </button>
                        </>
                    )}
                    {isOpen && isSidebarVisible && (
                        <div className="absolute right-0 bottom-11 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-10">
                            <ul className="py-2">
                                <li className="px-4 py-2 hover:bg-gray-100 cursor-pointer"><Link to="/profile">Profile</Link></li>
                                <li className="px-4 py-2 hover:bg-gray-100 cursor-pointer"><Link to="/settings">Settings</Link></li>
                                <li className="px-4 py-2 hover:bg-gray-100 cursor-pointer" onClick={handleLogout}>Logout</li>
                            </ul>
                        </div>
                    )}
                </div>
            </nav>
        </aside>
    )
}

export default DashboardAside;