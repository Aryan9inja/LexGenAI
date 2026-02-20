import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

type UserModelType = {
  name: string;
  email: string;
  password: string;
};

interface UserMethods {
  comparePassword(candidatePassword: string): Promise<boolean>;
  generateJWT(): string;
}

type UserModel = mongoose.Model<UserModelType, {}, UserMethods>;

const userSchema = new mongoose.Schema<UserModelType, UserModel, UserMethods>(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
  },
  { timestamps: true },
);

userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  } catch (err) {
    throw new Error("Error hashing password");
  }
});

userSchema.methods.comparePassword = async function (
  candidatePassword: string,
) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (err) {
    throw new Error("Error comparing passwords");
  }
};

userSchema.methods.generateJWT = function () {
  try {
    return jwt.sign(
      { id: this._id },
      process.env.JWT_SECRET ? process.env.JWT_SECRET : "secret",
      { expiresIn: "1h" },
    );
  } catch (err) {
    throw new Error("Error generating JWT");
  }
};

const User = mongoose.model<UserModelType, UserModel>("User", userSchema);
export default User;
