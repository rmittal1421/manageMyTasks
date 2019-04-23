const mongoose = require('mongoose')
const validator = require('validator')
const bcrypt = require ('bcrypt')
const jwt = require ('jsonwebtoken')

const userSchema = new mongoose.Schema ({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        unique: true,
        required: true,
        trim: true,
        lowercase: true,
        validate(value) {
            if (!validator.isEmail(value)) {
                throw new Error('Email is invalid')
            }
        }
    },
    password: {
        type: String,
        required: true,
        minlength: 7,
        trim: true,
        validate(value) {
            if (value.toLowerCase().includes('password')) {
                throw new Error('Password cannot contain "password"')
            }
        }
    },
    age: {
        type: Number,
        default: 0,
        validate(value) {
            if (value < 0) {
                throw new Error('Age must be a postive number')
            }
        }
    },
    tokens: [{
        token: {
            type: String,
            required: true
        }
    }],
    avatar: {
        type: Buffer
    }
}, {
    timestamps: true
})

userSchema.virtual ('tasks', {
    ref: 'Task',
    localField: '_id',
    foreignField: 'owner'
})

userSchema.statics.checkCredentials = async (email, _password) => {
    const user = await User.findOne ({email})
    if (!user) {
        throw new Error ('Invalid operation')
    }

    const validPass = await bcrypt.compare (_password, user.password)
    if (!validPass) throw new Error ('Invalid operation')
    return user
}

userSchema.methods.toJSON = function () {
    const user = this
    const userObject = user.toObject()

    delete userObject.tokens
    delete userObject.password
    delete userObject.avatar

    return userObject
}

userSchema.methods.generateAuthToken = async function () {
    const user = this
    const token = jwt.sign ({ _id:user._id.toString() }, 'thisismynodecourse') 

    user.tokens = user.tokens.concat ({token})
    await user.save()
    return token
}

userSchema.pre ('save', async function (next) {
    const user = this

    if (user.isModified('password')) {
        user.password = await bcrypt.hash (user.password, 8)
    }

    next() 
})

userSchema.pre ('remove', async function (next) {
    const user = this

    const Task = require ('../models/task')
    await Task.deleteMany ({ owner : user._id })

    next() 
})

const User = mongoose.model('User', userSchema)

module.exports = User