import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const BACKEND_URL = "https://sharesphere-in.onrender.com";
const API = `${BACKEND_URL}/api`;

const FeedbackScreen = () => {
  const { transactionId } = useParams();
  const navigate = useNavigate();
  const [transaction, setTransaction] = useState(null);
  const [item, setItem] = useState(null);
  const [otherUser, setOtherUser] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Form data
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [review, setReview] = useState('');
  const [hasDamage, setHasDamage] = useState(false);
  const [damageSeverity, setDamageSeverity] = useState('light');
  const [hasComplaint, setHasComplaint] = useState(false);
  const [complaintType, setComplaintType] = useState('behavior');
  const [complaintDescription, setComplaintDescription] = useState('');

  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    fetchTransactionDetails();
    fetchCurrentUser();
  }, [transactionId]);

  const fetchCurrentUser = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`);
      setCurrentUser(response.data);
    } catch (error) {
      console.error('Failed to fetch current user:', error);
    }
  };

  const fetchTransactionDetails = async () => {
    try {
      // Get transaction from activities
      const activitiesResponse = await axios.get(`${API}/my-activities`);
      const allTransactions = [
        ...activitiesResponse.data.as_borrower,
        ...activitiesResponse.data.as_owner
      ];
      
      const transactionData = allTransactions.find(t => t.transaction.id === transactionId);
      
      if (!transactionData) {
        setError('Transaction not found');
        setLoading(false);
        return;
      }

      setTransaction(transactionData.transaction);
      setItem(transactionData.item);
      
      // Determine if current user is owner and set other user
      const userResponse = await axios.get(`${API}/auth/me`);
      const currentUserId = userResponse.data.id;
      setIsOwner(transactionData.transaction.owner_id === currentUserId);
      
      // Mock other user for now (in real app, you'd fetch user details)
      const otherUserId = transactionData.transaction.owner_id === currentUserId 
        ? transactionData.transaction.borrower_id 
        : transactionData.transaction.owner_id;
      
      setOtherUser({
        id: otherUserId,
        username: isOwner ? 'Borrower' : 'Owner'
      });

    } catch (error) {
      setError('Failed to fetch transaction details');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const submitFeedback = async () => {
    if (rating === 0) {
      setError('Please provide a star rating');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      // Submit review
      await axios.post(`${API}/reviews`, {
        transaction_id: transactionId,
        reviewed_user_id: otherUser.id,
        stars: rating,
        comment: review || null
      });

      // Submit complaint if any
      if (hasComplaint && complaintDescription.trim()) {
        await axios.post(`${API}/complaints`, {
          complained_user_id: otherUser.id,
          transaction_id: transactionId,
          type: complaintType,
          description: complaintDescription
        });
      }

      // Handle damage if owner and has damage
      if (isOwner && hasDamage) {
        // Note: Damage was already handled in confirm-return, this is just for UI feedback
        console.log(`Damage severity: ${damageSeverity} was already processed`);
      }

      setSuccess('Feedback submitted successfully!');
      
      setTimeout(() => {
        navigate('/my-activities');
      }, 2000);

    } catch (error) {
      setError('Failed to submit feedback');
      console.error('Error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const renderStarRating = () => {
    return (
      <div className="flex space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            className={`text-2xl ${
              star <= (hoverRating || rating) ? 'text-yellow-400' : 'text-gray-300'
            } hover:text-yellow-400 transition-colors`}
            onClick={() => setRating(star)}
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
          >
            ★
          </button>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading transaction details...</div>
      </div>
    );
  }

  if (error && !transaction) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Transaction Feedback</h1>
              <p className="text-red-600 text-sm font-medium mt-1">
                ⚠️ Feedback is mandatory to complete this transaction
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-8">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
              {success}
            </div>
          )}

          {/* Transaction Summary */}
          <div className="mb-8 bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-800 mb-2">Transaction Summary</h3>
            <p className="text-gray-600">Item: <span className="font-medium">{item?.title}</span></p>
            <p className="text-gray-600">
              You were the: <span className="font-medium">{isOwner ? 'Owner' : 'Borrower'}</span>
            </p>
            <p className="text-gray-600">Duration: {transaction?.days} days</p>
            <p className="text-gray-600">Tokens: {transaction?.total_tokens}</p>
          </div>

          {/* Rating Section */}
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-3">
              Rate the {isOwner ? 'Borrower' : 'Owner'} *
            </label>
            {renderStarRating()}
            <p className="text-sm text-gray-500 mt-1">Click to rate from 1 to 5 stars</p>
          </div>

          {/* Review Section */}
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Review (Optional)
            </label>
            <textarea
              value={review}
              onChange={(e) => setReview(e.target.value)}
              rows="4"
              placeholder="Share your experience..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
            />
          </div>

          {/* Damage Section (Only for Owners) */}
          {isOwner && (
            <div className="mb-6 border-t pt-6">
              <h4 className="font-semibold text-gray-800 mb-3">Item Condition</h4>
              <div className="mb-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={hasDamage}
                    onChange={(e) => setHasDamage(e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-gray-700">Item was returned with damage</span>
                </label>
              </div>

              {hasDamage && (
                <div className="ml-6">
                  <label className="block text-gray-700 text-sm font-bold mb-2">
                    Damage Severity
                  </label>
                  <select
                    value={damageSeverity}
                    onChange={(e) => setDamageSeverity(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  >
                    <option value="light">Light (¼ item value)</option>
                    <option value="medium">Medium (⅓ item value)</option>
                    <option value="high">High (½ item value)</option>
                    <option value="severe">Severe (Full item value)</option>
                  </select>
                  <p className="text-sm text-gray-500 mt-1">
                    Damage penalties will be automatically calculated and deducted
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Complaint Section */}
          <div className="mb-8 border-t pt-6">
            <h4 className="font-semibold text-gray-800 mb-3">Complaint (Optional)</h4>
            <div className="mb-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={hasComplaint}
                  onChange={(e) => setHasComplaint(e.target.checked)}
                  className="mr-2"
                />
                <span className="text-gray-700">I have a complaint about this transaction</span>
              </label>
            </div>

            {hasComplaint && (
              <div className="ml-6 space-y-4">
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2">
                    Complaint Type
                  </label>
                  <select
                    value={complaintType}
                    onChange={(e) => setComplaintType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  >
                    <option value="behavior">Inappropriate Behavior</option>
                    <option value="delivery">Delivery Issues</option>
                    <option value="damage">Item Damage</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2">
                    Complaint Description *
                  </label>
                  <textarea
                    value={complaintDescription}
                    onChange={(e) => setComplaintDescription(e.target.value)}
                    rows="3"
                    placeholder="Please describe the issue in detail..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    required={hasComplaint}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Submit Button - MANDATORY FEEDBACK, NO SKIP OPTION */}
          <div className="flex justify-center">
            <button
              onClick={submitFeedback}
              disabled={submitting || rating === 0}
              className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-3 px-6 rounded-md transition-colors disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit Feedback'}
            </button>
          </div>

          <div className="mt-4 text-center">
            <p className="text-sm text-gray-600">
              Note: You must provide feedback to complete this transaction. 
              This helps maintain community trust and quality.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeedbackScreen;
