import mongoose from 'mongoose'

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
      index: true,
    },
    // Google-only accounts do not have a password. Email/password accounts do.
    passwordHash: {
      type: String,
      required: false,
      select: false,
    },
    // Stable Google account identifier from Passport's verified Google profile.
    googleId: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
)

export const User = mongoose.model('User', userSchema)
