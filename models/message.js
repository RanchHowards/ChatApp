const mongoose = require('mongoose')

const schema = new mongoose.Schema(
  {
    message: {
      type: String,
      required: true,

      minlength: 1,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },

  { timestamps: true }
)

module.exports = mongoose.model('Message', schema)
