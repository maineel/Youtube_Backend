import mongoose, {Schema} from "mongoose";

const likeSchema = new Schema(
    {
        tweet:{
            type: Schema.Types.ObjectId,
            ref: "Tweet"
        },
        comment:{
            type: Schema.Types.ObjectId,
            ref: "Comment"
        },
        video:{
            type: Schema.Types.ObjectId,
            ref:"Video"
        },
        likedBy:{
            type: Schema.T.ObjectId,
            ref: "User"
        }
    },{timestamps:true}
)

export const Like = mongoose.model("Like", likeSchema);