// ===== Firebase Integration for Customer Site =====
// fireDb is set by js/firebase-db.js (module) which targets named DB "sivasureshagency"
// fsServerTimestamp and fsIncrement are also set by firebase-db.js

// ===== Save Order to Firestore =====
async function saveOrderToFirebase(order, shippingDetails) {
    try {
        if (!window.fireDb) throw new Error('Firebase not initialised');
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
            createdAt: fsServerTimestamp(),
            updatedAt: fsServerTimestamp()
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
                createdAt: fsServerTimestamp()
            });
        } else {
            const doc = existingCustomer.docs[0];
            await doc.ref.update({
                orderCount: fsIncrement(1),
                totalSpent: fsIncrement(order.total),
                phone: shippingDetails.phone
            });
        }
    } catch (err) {
        console.error('Firebase order save error:', err);
        // Show a non-blocking warning so the user knows the order may not appear in admin
        if (err.code === 'permission-denied' || err.message.includes('permission')) {
            setTimeout(() => alert('Your order was placed but could not be synced to the server.\nPlease contact us to confirm your order: ' + (order.id || '')), 500);
        }
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
                createdAt: fsServerTimestamp()
            });
        }
    } catch (err) {
        console.error('Firebase customer save error:', err);
    }
}

// Expose to global scope
window.saveOrderToFirebase = saveOrderToFirebase;
window.saveCustomerToFirebase = saveCustomerToFirebase;
