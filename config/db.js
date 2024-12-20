const mongoose = require('mongoose');

const connectDB = async () => {
  if (!process.env.MONGO_URI) {
    console.error("MongoDB Uri not set in environment variable");
    process.exit();
  }

  try {
    const con = await mongoose.connect(process.env.MONGO_URI);
    // console.log(`Database connected: ${con.connection.host}`);
  } catch (error) {
    console.error(`Error connecting to MongoDb: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;