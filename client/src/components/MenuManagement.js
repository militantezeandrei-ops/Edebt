import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import API_URL from '../config/api';
import './MenuManagement.css';
import { OfflineStorage } from '../utils/offlineStorage';
import * as IDB from '../utils/indexedDB';

const MenuManagement = ({ onBack }) => {
    const [menuItems, setMenuItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [newItem, setNewItem] = useState({
        name: '',
        price: '',
        category: 'main',
        is_available: true
    });
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState(null);

    // Toast Configuration
    const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: true
    });

    // Emojis for categories
    const categoryIcons = {
        main: '🍛',
        drink: '🥤',
        dessert: '🍰',
        other: '🥗'
    };

    useEffect(() => {
        fetchMenuItems();

        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const fetchMenuItems = async () => {
        setLoading(true);

        // CACHE-FIRST: Load from IndexedDB immediately
        try {
            const cachedMenu = await IDB.getAllMenuItems();
            if (cachedMenu && cachedMenu.length > 0) {
                setMenuItems(cachedMenu);
                console.log('[MenuManagement] Loaded from IndexedDB:', cachedMenu.length);
            } else {
                const localCached = OfflineStorage.loadData('menu');
                if (localCached) {
                    setMenuItems(localCached);
                }
            }
        } catch (e) {
            console.error('Error loading cached menu:', e);
        }

        // THEN: Try to update from server if online
        if (navigator.onLine) {
            try {
                const res = await axios.get(`${API_URL}/api/menu`);
                setMenuItems(res.data);
                await IDB.saveMenuItems(res.data);
                OfflineStorage.saveData('menu', res.data);
            } catch (err) {
                console.log('[MenuManagement] Could not update from server:', err.message);
                if (menuItems.length === 0) {
                    Toast.fire({
                        icon: 'warning',
                        title: 'Offline Mode: Showing cached menu'
                    });
                }
            }
        }

        setLoading(false);
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setNewItem(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const itemData = {
            ...newItem,
            price: parseFloat(newItem.price)
        };

        // Try server first if online
        if (isOnline) {
            try {
                if (isEditing) {
                    await axios.put(`${API_URL}/api/menu/${editId}`, itemData);
                    Toast.fire({ icon: 'success', title: 'Item updated successfully' });
                } else {
                    await axios.post(`${API_URL}/api/menu`, itemData);
                    Toast.fire({ icon: 'success', title: 'Item added successfully' });
                }
                fetchMenuItems();
                resetForm();
                return;
            } catch (err) {
                console.log('[MenuManagement] Server save failed, saving offline:', err.message);
            }
        }

        // Offline save
        const offlineItem = {
            ...itemData,
            _id: isEditing ? editId : 'temp_' + Date.now(),
            syncStatus: 'pending',
            createdAt: new Date().toISOString()
        };

        // Save to IndexedDB
        await IDB.saveMenuItem(offlineItem);

        // Update local state
        if (isEditing) {
            setMenuItems(prev => prev.map(item =>
                item._id === editId ? offlineItem : item
            ));
        } else {
            setMenuItems(prev => [...prev, offlineItem]);
        }

        // Queue for sync
        OfflineStorage.queueRequest({
            type: 'menu',
            url: isEditing ? `${API_URL}/api/menu/${editId}` : `${API_URL}/api/menu`,
            method: isEditing ? 'PUT' : 'POST',
            body: itemData
        });

        Toast.fire({
            icon: 'info',
            title: isEditing ? 'Item updated offline' : 'Item added offline',
            text: 'Will sync when online'
        });

        resetForm();
    };

    const handleEdit = (item) => {
        setNewItem({
            name: item.name,
            price: item.price,
            category: item.category,
            is_available: item.is_available
        });
        setIsEditing(true);
        setEditId(item._id);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id) => {
        const result = await Swal.fire({
            title: 'Are you sure?',
            text: "You won't be able to revert this!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, delete it!'
        });

        if (result.isConfirmed) {
            // Remove from local state immediately
            setMenuItems(prev => prev.filter(item => item._id !== id));

            if (isOnline) {
                try {
                    await axios.delete(`${API_URL}/api/menu/${id}`);
                    Swal.fire('Deleted!', 'Item has been deleted.', 'success');
                    return;
                } catch (err) {
                    console.log('[MenuManagement] Server delete failed:', err.message);
                }
            }

            // Queue deletion for sync if offline or server failed
            OfflineStorage.queueRequest({
                type: 'menu_delete',
                url: `${API_URL}/api/menu/${id}`,
                method: 'DELETE',
                body: { id }
            });

            Toast.fire({
                icon: 'info',
                title: 'Item deleted offline',
                text: 'Will sync when online'
            });
        }
    };

    const toggleAvailability = async (item) => {
        const updatedItem = { ...item, is_available: !item.is_available };

        // Optimistic update
        setMenuItems(prev => prev.map(i => i._id === item._id ? updatedItem : i));

        if (isOnline) {
            try {
                await axios.put(`${API_URL}/api/menu/${item._id}`, updatedItem);
                Toast.fire({
                    icon: 'success',
                    title: `Marked as ${updatedItem.is_available ? 'Available' : 'Unavailable'}`
                });
                return;
            } catch (err) {
                console.log('[MenuManagement] Toggle failed:', err.message);
            }
        }

        // Save offline
        await IDB.saveMenuItem({ ...updatedItem, syncStatus: 'pending' });
        OfflineStorage.queueRequest({
            type: 'menu',
            url: `${API_URL}/api/menu/${item._id}`,
            method: 'PUT',
            body: updatedItem
        });

        Toast.fire({
            icon: 'info',
            title: 'Updated offline',
            text: 'Will sync when online'
        });
    };

    const resetForm = () => {
        setNewItem({
            name: '',
            price: '',
            category: 'main',
            is_available: true
        });
        setIsEditing(false);
        setEditId(null);
    };

    return (
        <div className="menu-management fade-in">
            <div className="header-row">
                <h2>Menu Management</h2>
                {!isOnline && <span className="offline-badge">📴 Offline</span>}
            </div>

            <div className="menu-content-grid">
                {/* Form Section */}
                <div className="menu-form-card">
                    <h3>{isEditing ? 'Edit Item' : 'Add New Item'}</h3>
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label>Item Name</label>
                            <input
                                name="name"
                                value={newItem.name}
                                onChange={handleInputChange}
                                required
                                placeholder="e.g. Adobo Rice"
                                className="modern-input"
                            />
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Price</label>
                                <input
                                    name="price"
                                    type="number"
                                    step="0.01"
                                    value={newItem.price}
                                    onChange={handleInputChange}
                                    required
                                    placeholder="0.00"
                                    className="modern-input"
                                />
                            </div>
                            <div className="form-group">
                                <label>Category</label>
                                <select
                                    name="category"
                                    value={newItem.category}
                                    onChange={handleInputChange}
                                    className="modern-select"
                                >
                                    <option value="main">Main Course</option>
                                    <option value="drink">Drink</option>
                                    <option value="dessert">Dessert</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                        </div>

                        {!isEditing && (
                            <div className="form-group">
                                <label className="flex-center-y">
                                    <span className="mr-2">Initial Availability</span>
                                    <input
                                        name="is_available"
                                        type="checkbox"
                                        checked={newItem.is_available}
                                        onChange={handleInputChange}
                                        className="toggle-checkbox"
                                    />
                                </label>
                            </div>
                        )}

                        <div className="button-group">
                            <button type="submit" className="button button-primary full-width">
                                {isEditing ? 'Update Item' : 'Add Item'}
                            </button>
                            {isEditing && (
                                <button type="button" className="button button-ghost" onClick={resetForm}>
                                    Cancel
                                </button>
                            )}
                        </div>
                    </form>
                </div>

                {/* List Section */}
                <div className="menu-list-container">
                    <h3>Menu Items <span className="subtitle">({menuItems.length})</span></h3>
                    {loading ? <div className="spinner"></div> : (
                        <div className="menu-cards">
                            {menuItems.map(item => (
                                <div key={item._id} className={`menu-card ${item.syncStatus === 'pending' ? 'pending-sync' : ''}`} onClick={() => handleEdit(item)}>
                                    {/* Pending sync indicator */}
                                    {item.syncStatus === 'pending' && (
                                        <div className="sync-badge" title="Pending sync">🔄</div>
                                    )}

                                    {/* Toggle Switch */}
                                    <div className="status-toggle" onClick={(e) => e.stopPropagation()}>
                                        <div className={`toggle-switch ${item.is_available ? 'on' : 'off'}`} onClick={() => toggleAvailability(item)} title="Toggle Availability">
                                            <div className="toggle-handle"></div>
                                        </div>
                                    </div>

                                    {/* Main Content */}
                                    <div className="menu-info">
                                        <h4>{item.name}</h4>
                                        <div className="menu-meta">
                                            <span className="price">P {item.price.toFixed(2)}</span>
                                        </div>
                                    </div>

                                    {/* Actions Overlay */}
                                    <div className="menu-actions">
                                        <button onClick={(e) => { e.stopPropagation(); handleEdit(item); }} className="icon-btn edit-btn" aria-label="Edit" title="Edit">
                                            ✏️
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); handleDelete(item._id); }} className="icon-btn delete-btn" aria-label="Delete" title="Delete">
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Padding for bottom nav */}
            <div style={{ height: '80px' }}></div>
        </div>
    );
};

export default MenuManagement;
