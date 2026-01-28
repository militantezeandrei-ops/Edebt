import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import API_URL from '../config/api';
import './HandwrittenCapture.css';
import { OfflineStorage } from '../utils/offlineStorage';
import { validateOrder } from '../utils/validationService';
import Swal from 'sweetalert2';

const HandwrittenCapture = ({ onCaptureSuccess, onCustomerNotFound, newlyCreatedCustomer, onClearNewCustomer }) => {
    const [captureMode, setCaptureMode] = useState('idle'); // 'idle', 'camera', 'preview', 'processing', 'results'
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);
    const [capturedImage, setCapturedImage] = useState(null);
    const [isSecureContext, setIsSecureContext] = useState(true);

    // OCR Results State
    // OCR Results State (Modified for Multi-Result)
    const [rawText, setRawText] = useState('');
    const [detectedOrders, setDetectedOrders] = useState([]); // Array of { id, originalName, validatedCustomer, items, status }
    const [pendingNewCustomerOrderId, setPendingNewCustomerOrderId] = useState(null); // Track which order is waiting for new customer


    // Customers & Menu for validation
    const [customers, setCustomers] = useState([]);
    const [menuItems, setMenuItems] = useState([]);

    // Check secure context
    useEffect(() => {
        const isSecure = window.isSecureContext ||
            window.location.protocol === 'https:' ||
            window.location.hostname === 'localhost' ||
            window.location.hostname === '127.0.0.1';
        setIsSecureContext(isSecure);
    }, []);

    // Fetch customers and menu items for validation with intelligent caching
    useEffect(() => {
        const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

        const fetchData = async () => {
            try {
                // Check if we have recent cached data
                const customersCache = OfflineStorage.loadData('customers_cache');
                const menuCache = OfflineStorage.loadData('menu_cache');
                const now = Date.now();

                let customersData = customersCache?.data;
                let menuData = menuCache?.data;

                // Fetch customers if cache is stale or missing
                if (!customersCache || (now - customersCache.timestamp) > CACHE_DURATION) {
                    console.log('[HandwrittenCapture] Fetching fresh customer data...');
                    const customersRes = await axios.get(`${API_URL}/api/customers`);
                    customersData = customersRes.data;
                    OfflineStorage.saveData('customers_cache', { data: customersData, timestamp: now });
                    OfflineStorage.saveData('customers', customersData); // Keep offline copy
                } else {
                    console.log('[HandwrittenCapture] Using cached customer data');
                }

                // Fetch menu if cache is stale or missing
                if (!menuCache || (now - menuCache.timestamp) > CACHE_DURATION) {
                    console.log('[HandwrittenCapture] Fetching fresh menu data...');
                    const menuRes = await axios.get(`${API_URL}/api/menu`);
                    menuData = menuRes.data;
                    OfflineStorage.saveData('menu_cache', { data: menuData, timestamp: now });
                    OfflineStorage.saveData('menu', menuData); // Keep offline copy
                } else {
                    console.log('[HandwrittenCapture] Using cached menu data');
                }

                setCustomers(customersData || []);
                setMenuItems(menuData || []);
            } catch (err) {
                console.error("Error loading data:", err);
                // Offline Fallback
                const cachedCustomers = OfflineStorage.loadData('customers');
                const cachedMenu = OfflineStorage.loadData('menu');
                if (cachedCustomers) setCustomers(cachedCustomers);
                if (cachedMenu) setMenuItems(cachedMenu);
            }
        };
        fetchData();
    }, []);

    // Cleanup camera on unmount
    useEffect(() => {
        return () => {
            stopCamera();
        };
    }, []);

    // Handle newly created customer - update the pending order
    useEffect(() => {
        if (newlyCreatedCustomer && pendingNewCustomerOrderId) {
            // Update the order that was waiting for this new customer
            setDetectedOrders(prev => prev.map(order =>
                order.id === pendingNewCustomerOrderId
                    ? {
                        ...order,
                        validatedCustomer: newlyCreatedCustomer,
                        customerConfidence: 1.0 // 100% match since we just created it
                    }
                    : order
            ));
            // Clear the pending state
            setPendingNewCustomerOrderId(null);
            // Also add to local customers list for future matches
            setCustomers(prev => [...prev, newlyCreatedCustomer]);
            // Tell parent to clear the newlyCreatedCustomer
            if (onClearNewCustomer) {
                onClearNewCustomer();
            }
        }
    }, [newlyCreatedCustomer, pendingNewCustomerOrderId, onClearNewCustomer]);

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
    };

    const startCamera = async () => {
        // if (!isSecureContext) {
        //     setError("Camera requires HTTPS or localhost.");
        //     return;
        // }

        setCaptureMode('camera');
        setError(null);
        setCapturedImage(null);
        setCaptureMode('camera');
        setError(null);
        setCapturedImage(null);
        setRawText('');
        setDetectedOrders([]);


        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'environment',
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                }
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            console.error("Camera start error:", err);
            // Show exact error to user for debugging
            setError(`Camera Error: ${err.name} - ${err.message}. Ensure permission is granted and site is trusted.`);
            setCaptureMode('idle');
        }
    };

    const capturePhoto = () => {
        if (!videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        // Calculate scale to fit within max dimensions (optimized for OCR + performance)
        const MAX_WIDTH = 800; // Reduced from 1024 for faster upload
        let width = video.videoWidth;
        let height = video.videoHeight;

        if (width > MAX_WIDTH) {
            const scaleFactor = MAX_WIDTH / width;
            width = MAX_WIDTH;
            height = height * scaleFactor;
        }

        // Set canvas size to scaled dimensions
        canvas.width = width;
        canvas.height = height;

        // Draw video frame to canvas with scaling
        context.drawImage(video, 0, 0, width, height);

        // Get image as base64 with optimized quality (0.6) for faster upload
        const imageData = canvas.toDataURL('image/jpeg', 0.6);
        setCapturedImage(imageData);

        // Stop camera and switch to preview mode
        stopCamera();
        setCaptureMode('preview');
    };

    const retakePhoto = () => {
        setCapturedImage(null);
        setRawText('');
        setDetectedOrders([]);
        startCamera();
    };

    const processImage = async () => {
        if (!capturedImage) return;

        setLoading(true);
        setCaptureMode('processing');
        setError(null);

        try {
            // Send image to backend for OCR processing
            const response = await axios.post(`${API_URL}/api/ocr/process`, {
                image: capturedImage
            }, { timeout: 30000 });

            const { rawText, parsedOrders } = response.data;
            setRawText(rawText);

            // Process and Validate Each Detected Order
            const processed = parsedOrders.map((order, index) => {
                const validation = validateOrder(order, customers, menuItems);
                return {
                    id: Date.now() + index, // Temporary ID for list rendering
                    originalName: order.name,
                    validatedCustomer: validation.customer,
                    customerConfidence: validation.customerConfidence,
                    items: validation.items,
                    status: 'pending' // pending, saved, error
                };
            });

            setDetectedOrders(processed);
            setCaptureMode('results');
        } catch (err) {
            console.error("OCR processing error:", err);
            const errorMessage = err.response?.data?.error || "Failed to process image. Please try again or use manual entry.";
            setError(errorMessage);
            setCaptureMode('preview');
        } finally {
            setLoading(false);
        }
    };

    const confirmGenericOrder = async (orderItem) => {
        try {
            if (!orderItem.validatedCustomer) {
                // Track which order needs a new customer, then trigger the create flow
                setPendingNewCustomerOrderId(orderItem.id);
                if (onCustomerNotFound) {
                    onCustomerNotFound(orderItem.originalName, orderItem.items, orderItem.id);
                }
                return;
            }

            setLoading(true);
            // Direct API call to create order (Batch Mode optimization)
            // We calculate the total amount here
            const totalAmount = orderItem.items.reduce((sum, item) => {
                return sum + (item.validatedPrice || parseFloat(item.originalPrice) || 0);
            }, 0);

            const orderPayload = {
                customer_unique_id: orderItem.validatedCustomer.unique_id,
                order_name: `Scanned Order - ${new Date().toLocaleDateString()}`,
                order_description: orderItem.items.map(i => `${i.validatedName || i.originalName} (${i.validatedPrice || i.originalPrice})`).join(', '),
                order_amount: totalAmount,
                order_status: 'completed'
            };

            await axios.post(`${API_URL}/api/order`, orderPayload);

            // Update local status to saved
            setDetectedOrders(prev => prev.map(o =>
                o.id === orderItem.id ? { ...o, status: 'saved' } : o
            ));

        } catch (err) {
            console.error("Failed to save order:", err);
            alert("Failed to save order. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const confirmAllValid = async () => {
        const validOrders = detectedOrders.filter(o => o.validatedCustomer && o.status !== 'saved');
        if (validOrders.length === 0) return;

        setLoading(true);
        let savedCount = 0;

        // Sequential save for simplicity and reliability
        for (const order of validOrders) {
            try {
                await confirmGenericOrder(order);
                savedCount++;
            } catch (err) {
                console.error('Failed to save order:', err);
            }
        }
        setLoading(false);

        // Show success alert and return to home
        await Swal.fire({
            icon: 'success',
            title: 'Orders Saved!',
            text: `Successfully saved ${savedCount} order(s)`,
            timer: 2000,
            showConfirmButton: false,
            background: 'var(--card-bg)',
            color: 'var(--text-primary)'
        });

        // Reset to home (idle state)
        cancelCapture();
    };

    // Inline edit item in order
    const updateOrderItem = (orderId, itemIndex, field, value) => {
        setDetectedOrders(prev => prev.map(order => {
            if (order.id !== orderId) return order;
            const updatedItems = [...order.items];
            if (field === 'name') {
                updatedItems[itemIndex] = {
                    ...updatedItems[itemIndex],
                    validatedName: value,
                    originalName: value
                };
            } else if (field === 'price') {
                updatedItems[itemIndex] = {
                    ...updatedItems[itemIndex],
                    validatedPrice: parseFloat(value) || 0,
                    originalPrice: value
                };
            }
            return { ...order, items: updatedItems };
        }));
    };

    const cancelCapture = () => {
        stopCamera();
        setCaptureMode('idle');
        setCapturedImage(null);
        setDetectedOrders([]);
        setRawText('');

        setError(null);
    };



    return (
        <div className="handwritten-capture-container">
            <div className="card capture-card">
                <h2>📝 Capture Order Slip</h2>

                {error && (
                    <div className={`error-message ${!isSecureContext ? 'warning-bg' : ''}`}>
                        {error}
                    </div>
                )}

                {loading && (
                    <div className="loading-overlay">
                        <div className="loading-spinner"></div>
                        <p>Processing handwritten text...</p>
                    </div>
                )}

                {/* Main Interface */}
                <div className="capture-ui">
                    {/* Idle State - Show action buttons */}
                    {captureMode === 'idle' && (
                        <div className="capture-buttons fade-in">
                            <button className="capture-btn camera-btn" onClick={startCamera}>
                                <span className="btn-icon">📸</span>
                                Capture Order Slip
                            </button>

                            <p className="capture-instruction">
                                Take a photo of handwritten order slip
                            </p>
                        </div>
                    )}



                    {/* Camera Mode */}
                    {captureMode === 'camera' && (
                        <div className="camera-view fade-in">
                            <div className="video-container">
                                <video ref={videoRef} autoPlay playsInline className="camera-preview" />
                                <div className="capture-frame">
                                    <div className="frame-corner top-left"></div>
                                    <div className="frame-corner top-right"></div>
                                    <div className="frame-corner bottom-left"></div>
                                    <div className="frame-corner bottom-right"></div>
                                </div>
                            </div>
                            <p className="camera-hint">Position the order slip within the frame</p>
                            <div className="camera-actions">
                                <button className="button button-ghost" onClick={cancelCapture}>Cancel</button>
                                <button className="button button-capture" onClick={capturePhoto}>
                                    <span className="capture-icon">📷</span>
                                    Capture
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Preview Mode */}
                    {captureMode === 'preview' && capturedImage && (
                        <div className="preview-view fade-in">
                            <div className="image-preview">
                                <img src={capturedImage} alt="Captured order slip" />
                            </div>
                            <div className="preview-actions">
                                <button className="button button-ghost" onClick={retakePhoto}>Retake</button>
                                <button className="button button-primary" onClick={processImage}>
                                    Process Order
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Results / List Mode */}
                    {captureMode === 'results' && (
                        <div className="results-view fade-in">
                            <div className="results-header">
                                <h3>📋 Detected Orders ({detectedOrders.length})</h3>
                            </div>

                            <div className="orders-list">
                                {detectedOrders.map((order) => (
                                    <div key={order.id} className={`order-card ${order.status === 'saved' ? 'saved' : ''}`}>
                                        <div className="order-card-header">
                                            {order.validatedCustomer ? (
                                                <div className="customer-info">
                                                    <span className="customer-name">{order.validatedCustomer.name}</span>
                                                    <span className="confidence-pill" style={{
                                                        backgroundColor: order.customerConfidence > 0.8 ? '#10b981' : '#f59e0b'
                                                    }}>
                                                        {Math.round(order.customerConfidence * 100)}%
                                                    </span>
                                                </div>
                                            ) : (
                                                <div className="customer-info unknown">
                                                    <span className="customer-name">Unknown: "{order.originalName}"</span>
                                                    <span className="confidence-pill red">New?</span>
                                                </div>
                                            )}

                                            {order.status === 'saved' && <span className="status-badge">✅ Saved</span>}
                                        </div>

                                        {/* Editable Items List */}
                                        <div className="editable-items-list">
                                            {order.items.map((item, idx) => (
                                                <div key={idx} className="editable-item-row">
                                                    <input
                                                        type="text"
                                                        className="item-name-input"
                                                        value={item.validatedName || item.originalName}
                                                        onChange={(e) => updateOrderItem(order.id, idx, 'name', e.target.value)}
                                                        disabled={order.status === 'saved'}
                                                        placeholder="Item name"
                                                    />
                                                    <input
                                                        type="number"
                                                        className="item-price-input"
                                                        value={item.validatedPrice || item.originalPrice || ''}
                                                        onChange={(e) => updateOrderItem(order.id, idx, 'price', e.target.value)}
                                                        disabled={order.status === 'saved'}
                                                        placeholder="Price"
                                                    />
                                                </div>
                                            ))}
                                            {order.items.length === 0 && <p className="empty">No items detected</p>}
                                        </div>

                                        {order.status !== 'saved' && !order.validatedCustomer && (
                                            <div className="card-actions">
                                                <button className="btn-create" onClick={() => confirmGenericOrder(order)}>➕ Create Customer</button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Bottom Actions */}
                            <div className="results-bottom-actions">
                                <button className="button button-ghost" onClick={retakePhoto}>🔄 Retake</button>
                                <button
                                    className="button button-primary"
                                    onClick={confirmAllValid}
                                    disabled={
                                        // Disable if no valid orders to save OR if there are any unknown/invalid orders pending
                                        !detectedOrders.some(o => o.validatedCustomer && o.status !== 'saved') ||
                                        detectedOrders.some(o => !o.validatedCustomer && o.status !== 'saved')
                                    }
                                >
                                    💾 Save All
                                </button>
                            </div>

                            {/* Raw OCR Text (collapsible) */}
                            <details className="raw-text-details">
                                <summary>View Raw AI Response</summary>
                                <pre className="raw-text">{rawText || 'No text extracted'}</pre>
                            </details>
                        </div>
                    )}
                </div>

                {/* Hidden canvas for capturing frames */}
                <canvas ref={canvasRef} style={{ display: 'none' }} />
            </div>
        </div>
    );
};

export default HandwrittenCapture;
