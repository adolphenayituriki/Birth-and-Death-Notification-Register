import mongoose from 'mongoose'

export const mongoUri = process.env.MONGODB_URI?.trim()

export async function connectDb() {
  if (!mongoUri) return null

  mongoose.set('strictQuery', true)
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 })
  return mongoose.connection
}
