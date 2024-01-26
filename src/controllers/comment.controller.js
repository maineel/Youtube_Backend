import mongoose from "mongoose";
import { Comment } from "../models/comment.model.js";
import {APIError} from "../utils/APIError.js"
import {APIResponse} from "../utils/APIResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import { Video } from "../models/video.model.js";

const getVideoComments = asyncHandler(async (req, res) => {
    //TODO: get all comments for a video
    const {videoId} = req.params
    const {page = 1, limit = 10} = req.query

    const video = await Video.findById(videoId);
    if(!video) {
        throw new APIError(404, "Video not found")
    }

    const commentsAggregate = await Comment.aggregate([
        {
            $match:{
                _id: new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $lookup:{
                from:"users",
                localField:"owner",
                foreignField:"_id",
                as:"owner",
            }
        },
        {
            $lookup:{
                from:"likes",
                localField:"_id",
                foreignField:"comment",
                as:"likes"
            }
        },
        {
            $addFields:{
                likesCount:{
                    $size:"$likes"
                },
                owner:{
                    $first:"$owner"
                },
                isLiked:{
                    $cond:{
                        if:{$in: [req.user?._id, "likes.likedBy"]},
                        then:true,
                        else:false
                    }
                }
            }
        },
        {
            $project: {
                content: 1,
                createdAt: 1,
                likesCount: 1,
                owner: {
                    username: 1,
                    fullName: 1,
                    "avatar.url": 1,
                },
                isLiked: 1
            },
        }
    ]);

    const options = {
        page: parseInt(page,10),
        limit: parseInt(limit,10)
    }

    const comments = await Comment.aggregatePaginate(commentsAggregate,options)

    return res
    .status(200)
    .json(new APIResponse(200, comments, "Comments fetched successfully"));
})

const addComment = asyncHandler(async (req, res) => {
    const {videoId} = req.params
    const {content} = req.body

    if(!content){
        throw new APIError(400,"Content is required")
    }

    const video = await Video.findById(videoId)

    if(!video){
        throw new APIError(404,"Video not found")
    }

    const comment = await Comment.create({
        content:content,
        video:videoId,
        owner:req.user?._id
    })

    if(!comment){
        throw new APIError(500, "Failed to add comment please try again")
    }

    return res
    .status(200)
    .json(new APIResponse(200,comment,"Comment added successfully"))
})

const updateComment = asyncHandler(async (req, res) => {
    const {commentId} = req.params
    const {content} = req.body

    if(!content){
        throw new APIError(400,"COntent is required")
    }

    const comment = await Comment.findById(commentId)

    if(!comment){
        throw new APIError(404,"Comment not found")
    }

    if (comment?.owner.toString() !== req.user?._id.toString()) {
        throw new APIError(400, "only comment owner can edit their comment");
    }

    const updatedComment = await Comment.findByIdAndUpdate(
        comment?._id,
        {
            $set:{
                content,
            }
        },
        {new:true}
    )

    if(!updatedComment){
        throw new APIError(500, "Failed to update comment")
    }

    return res
    .status(200)
    .json(new APIResponse(200,updateComment,"Comment updated successfully"))
})

const deleteComment = asyncHandler(async (req, res) => {
    const {commentId} = req.params
    
    const comment = await Comment.findById(commentId);

    if(!comment){
        throw new APIError(404,"Comment not found")
    }

    if (comment?.owner.toString() !== req.user?._id.toString()) {
        throw new APIError(400, "only comment owner can edit their comment");
    }

    const deletedComment = await Comment.findByIdAndDelete(comment?._id)

    if(!deletedComment){
        throw new APIError(500, "Failed to deleted comment")
    }

    return res
    .status(200)
    .json(new APIResponse(200,{},"Comment Deleted successfully"))
})

export {
    getVideoComments,
    addComment,
    updateComment,
    deleteComment
}
