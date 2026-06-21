// ===== Firebase Integration for Customer Site =====
// This file connects the customer-facing site to Firebase Firestore
// Orders and registrations are saved to the cloud database

const firebaseConfig = {
    apiKey: "AIzaSyD3H7U7WwkRWx6hvsQxTGkmGO2Uq9xd4n4",
    authDomain: "siva-suresh-agency.firebaseapp.com",
    projectId: "siva-suresh-agency",
    storageBucket: "siva-suresh-agency.firebasestorage.app",
    messagingSenderId: "1069646087757",
    appId: "1:1069646087757:web:986a9d840fcb77a68c3e04",
    measurementId: "G-D4RC21D55T"
};

// Initialize Firebase (only if not already initialized by admin)
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const fireDb = firebase.firestore();

// ===== Save Order to Firestore =====
async function saveOrderToFirebase(order, shippingDetails) {
    try {
        await fireDb.collection('orders').add({
            orderId: order.id,
            customerName: shippingDetails.firstname + ' ' + shippingDetails.lastname,
            customerEmail: shippingDetails.email,
            customerPhone: shippingDetails.phone,
            address: shippingDetails.address,
            city: shippingDetails.city,
            pincode: shippingDetails.pincode,
            items: order.items,
            total: order.total,
            payment: order.payment,
            status: 'Processing',
            trackingId: '',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Update or create customer record
        const customerRef = fireDb.collection('customers');
        const existingCustomer = await customerRef.where('email', '==', shippingDetails.email).get();
        if (existingCustomer.empty) {
            await customerRef.add({
                name: shippingDetails.firstname + ' ' + shippingDetails.lastname,
                email: shippingDetails.email,
                phone: shippingDetails.phone,
                orderCount: 1,
                totalSpent: order.total,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        } else {
            const doc = existingCustomer.docs[0];
            await doc.ref.update({
                orderCount: firebase.firestore.FieldValue.increment(1),
                totalSpent: firebase.firestore.FieldValue.increment(order.total),
                phone: shippingDetails.phone
            });
        }
    } catch (err) {
        console.error('Firebase order save error:', err);
    }
}

// ===== Save Customer Registration to Firestore =====
async function saveCustomerToFirebase(customerData) {
    try {
        const existing = await fireDb.collection('customers').where('email', '==', customerData.email).get();
        if (existing.empty) {
            await fireDb.collection('customers').add({
                name: customerData.firstName + ' ' + customerData.lastName,
                email: customerData.email,
                phone: customerData.phone,
                orderCount: 0,
                totalSpent: 0,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
    } catch (err) {
        console.error('Firebase customer save error:', err);
    }
}

// Expose to global scope
window.saveOrderToFirebase = saveOrderToFirebase;
window.saveCustomerToFirebase = saveCustomerToFirebase;
