import mongoose from 'mongoose';
import User from '../src/models/User';
import { config } from '../src/config/config';
import { UserRole } from '../src/interfaces/User';

const makeAdmin = async () => {
  try {
    await mongoose.connect(config.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const user = await User.findOne({ email: 'admin@demo.com' });
    
    if (!user) {
      console.log('❌ User not found');
      await mongoose.disconnect();
      return;
    }

    user.role = UserRole.ADMIN;
    user.isAdmin = true;
    user.isVerified = true;
    
    await user.save();
    
    console.log('\n✅ User upgraded to Admin successfully!');
    console.log('Email: admin@demo.com');
    console.log('Username: admin');
    console.log('Password: admin123');
    console.log('\n📝 You can now login with these credentials\n');

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

makeAdmin();

