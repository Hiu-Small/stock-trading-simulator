const db = require('../src/models');

async function checkUsers() {
    try {
        const users = await db.UserAccount.findAll({
            include: [
                { model: db.UserProfile, as: 'profile' },
                { model: db.Wallet, as: 'wallet' }
            ]
        });
        console.log('Total users:', users.length);
        users.forEach(u => {
            console.log(`ID: ${u.id}, Name: ${u.profile?.full_name}, Email: ${u.email}, Balance: ${u.wallet?.balance}, Role: ${u.role}`);
        });
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

checkUsers();
