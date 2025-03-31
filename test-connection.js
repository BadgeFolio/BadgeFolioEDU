const mongoose = require('mongoose');

const uri = 'mongodb+srv://emailmrdavola:O9NlpdI6tgBvSchb@badgesnew.hh8en.mongodb.net/badges-db?retryWrites=true&w=majority';

async function testConnection() {
  try {
    console.log('Attempting to connect to MongoDB...');
    await mongoose.connect(uri);
    console.log('Successfully connected to MongoDB!');
    await mongoose.connection.close();
    console.log('Connection closed.');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
  }
}

testConnection(); 