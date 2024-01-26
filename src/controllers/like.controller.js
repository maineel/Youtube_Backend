import mongoose from "mongoose";
import { Like } from "../models/like.model.js";
import { APIError } from "../utils/APIError.js";
import { APIResponse } from "../utils/APIResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Comment } from "../models/comment.model.js";
import { Video } from "../models/video.model.js";
import { Tweet } from "../models/tweet.model.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
    const {videoId} = req.params

    const video = await Video.findById(videoId)

    if(!video){
        throw new APIError(404,"Video not found")
    }

    const likedAlready = await Like.findOne({video: videoId, likedBy:req.user?._id})

    if(likedAlready){
        await Like.findByIdAndDelete(likedAlready?._id);
        
        return res
        .status(200)
        .json(new APIResponse(200, "Video unliked successfully"))
    }

    await Like.create({
        video:videoId,
        likedBy:req.user?._id
    })

    return res
    .status(200)
    .json(new APIResponse(200,"Video liked successfully"))
})

const toggleCommentLike = asyncHandler(async (req, res) => {
    const {commentid} = req.params

    const comment = await Comment.findById(commentid)

    if(!comment){
        throw new APIError(404,"Comment not found")
    }

    const likedAlready = await Like.findOne({comment: commentid, likedBy:req.user?._id})

    if(likedAlready){
        await Like.findByIdAndDelete(likedAlready?._id);
        
        return res
        .status(200)
        .json(new APIResponse(200, "Comment unliked successfully"))
    }

    await Like.create({
        comment:commentid,
        likedBy:req.user?._id
    })

    return res
    .status(200)
    .json(new APIResponse(200,"Comment liked successfully"))
})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const {tweetId} = req.params

    const tweet = await Tweet.findById(tweetId)

    if(!tweet){
        throw new APIError(404,"Tweet not found")
    }

    const likedAlready = await Like.findOne({tweet: tweetId, likedBy:req.user?._id})

    if(likedAlready){
        await Like.findByIdAndDelete(likedAlready?._id);
        
        return res
        .status(200)
        .json(new APIResponse(200, "Tweet unliked successfully"))
    }

    await Like.create({
        tweet:tweetId,
        likedBy:req.user?._id
    })

    return res
    .status(200)
    .json(new APIResponse(200,"Tweet liked successfully"))
})

const getLikedVideos = asyncHandler(async(req,res) => {
    const getLikedVideosAggregate = await Like.aggregate([
        {
            $match:{
                likedBy: new mongoose.Types.ObjectId(req.user?._id) 
            }
        },
        {
            $lookup:{
                from:"videos",
                localField:"video",
                foreignField:"_id",
                as:"likedVideo",
                pipeline:[
                    {
                        $lookup:{
                            from:"users",
                            localField:"owner",
                            foreignField:"_id",
                            as:"ownerDetails"
                        }
                    },
                    {
                        $unwind:"$ownerDetails"
                    }
                ]
            }
        },
        {
            $unwind:"$likedVideo"
        },
        {
            $sort:{
                createdAt:-1
            }
        },
        {
            $project: {
                _id: 0,
                likedVideo: {
                    _id: 1,
                    "videoFile.url": 1,
                    "thumbnail.url": 1,
                    owner: 1,
                    title: 1,
                    description: 1,
                    views: 1,
                    duration: 1,
                    createdAt: 1,
                    isPublished: 1,
                    ownerDetails: {
                        username: 1,
                        fullName: 1,
                        "avatar.url": 1,
                    },
                },
            },
        },
    ])

    return res
    .status(200)
    .json(new APIResponse(200,getLikedVideosAggregate,"Liked videos fetched successfully"))
})

export {toggleVideoLike, toggleCommentLike, toggleTweetLike, getLikedVideos}
