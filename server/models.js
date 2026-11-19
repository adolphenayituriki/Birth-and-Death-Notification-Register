import mongoose from 'mongoose'

const { Schema } = mongoose

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [80, 'Name cannot exceed 80 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
      unique: true,
      maxlength: [160, 'Email cannot exceed 160 characters'],
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
    },
    googleId: {
      type: String,
      default: null,
      index: true,
      sparse: true,
    },
    role: {
      type: String,
      required: [true, 'Role is required'],
      enum: {
        values: ['health_worker', 'registrar'],
        message: '{VALUE} is not a valid role',
      },
      index: true,
    },
    sector: {
      type: String,
      trim: true,
      maxlength: [80, 'Sector cannot exceed 80 characters'],
      default: '',
    },
  },
  { timestamps: true, collection: 'users' },
)

const notificationSchema = new Schema(
  {
    type: {
      type: String,
      required: [true, 'Notification type is required'],
      enum: {
        values: ['birth', 'death'],
        message: '{VALUE} is not a valid notification type',
      },
      index: true,
    },
    person_name: {
      type: String,
      required: [true, 'Person name is required'],
      trim: true,
      minlength: [2, 'Person name must be at least 2 characters'],
      maxlength: [100, 'Person name cannot exceed 100 characters'],
    },
    event_date: {
      type: Date,
      required: [true, 'Event date is required'],
      index: true,
    },
    reporter_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'reporter_id is required'],
      index: true,
    },
    status: {
      type: String,
      required: [true, 'Status is required'],
      enum: {
        values: ['pending', 'under_review', 'registered', 'rejected'],
        message: '{VALUE} is not a valid status',
      },
      default: 'pending',
      index: true,
    },
  },
  { timestamps: true, collection: 'notifications' },
)

notificationSchema.index({ person_name: 1, event_date: 1 }, { unique: true })
notificationSchema.index({ createdAt: -1 })

for (const schema of [userSchema, notificationSchema]) {
  schema.set('toJSON', {
    virtuals: true,
    transform(_doc, result) {
      result.id = result._id?.toString?.() ?? result._id
      result._id = result.id
      delete result.__v
      return result
    },
  })
}

export const User = mongoose.models.User || mongoose.model('User', userSchema)
export const Notification =
  mongoose.models.Notification || mongoose.model('Notification', notificationSchema)
