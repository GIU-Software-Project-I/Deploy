const { MongoClient } = require('mongodb');

(async () => {
    const client = new MongoClient('mongodb+srv://eyad:eyad2186@cluster0.o9vpa6w.mongodb.net/payroll');
    await client.connect();
    const db = client.db();
    
    const stats = await db.collection('employee_profiles').aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
    ]).toArray();
    
    console.log('Status breakdown:', JSON.stringify(stats, null, 2));
    const total = stats.reduce((s, x) => s + x.count, 0);
    console.log('Total employees:', total);
    
    await client.close();
})();
