const db = require('./src/models');

async function checkWallet() {
    try {
        const admin = await db.UserAccount.findOne({ where: { username: 'admin' } });
        if (!admin) {
            console.log('Admin user not found');
            return;
        }
        console.log('Admin User:', admin.id, admin.username, admin.account_number);

        const wallet = await db.Wallet.findOne({ where: { user_id: admin.id } });
        if (!wallet) {
            console.log('Wallet not found for admin');
        } else {
            console.log('Wallet Balance:', wallet.balance);
        }

        const adminWithWallet = await db.UserAccount.findOne({
            where: { id: admin.id },
            include: [{ model: db.Wallet, as: 'wallet' }]
        });
        console.log('Admin with Wallet included:', JSON.stringify(adminWithWallet, null, 2));

    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

checkWallet();
