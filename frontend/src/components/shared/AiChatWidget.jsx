import React, { useMemo, useState, useEffect, useRef } from 'react'; // Import React plus hooks for widget state and stable derived values.
import { useNavigate } from 'react-router-dom'; // Import router navigation helper to redirect users to search organically.
import { Bot, Send, X, Search, ShieldCheck, Sparkles } from 'lucide-react'; // Import lucide icons for the bot button, send action, and close action.
import api from '../../services/api'; // Import the shared Axios API client that already adds Firebase auth headers.
import { useAuth } from '../../context/AuthContext'; // Import auth context so the widget can safely chat only for patient users.

const AiChatWidget = () => { // Declare the floating AI widget component.
  const navigate = useNavigate(); // Navigation hook to push search states.
  const { user } = useAuth(); // Read current signed-in user (uid, role, email) from context.
  const [isOpen, setIsOpen] = useState(false); // Track whether the popup chat panel is open.
  const [messages, setMessages] = useState([ // Store local chat history for the widget UI.
    { id: 'w0', role: 'model', content: "Hi! I'm HEALTHBIRCH AI—describe your symptoms and I’ll help you find the right specialist." }, // Seed assistant greeting to match UX expectations.
  ]); // Close messages initialization.
  const [inputValue, setInputValue] = useState(''); // Store the current text in the widget input field.
  const [loadingChat, setLoadingChat] = useState(false); // Track whether the widget is waiting for the AI response.
  const [recommendation, setRecommendation] = useState(null); // Store the latest AI recommendation payload for the specialty card.
  const fetchedOpening = useRef(false); // Guard: fetch the personalised opening message only once per mount.

  const canChat = useMemo(() => { // Derive a boolean indicating whether the current user is allowed to call /api/chat.
    return Boolean(user && user.role === 'patient'); // Only allow chat when the backend role guard permits patients.
  }, [user]); // Recompute only when user changes.

  const canSend = useMemo(() => { // Derive whether the send action should be enabled.
    return canChat && inputValue.trim().length > 0 && !loadingChat; // Ensure patient role, non-empty input, and not currently loading.
  }, [canChat, inputValue, loadingChat]); // Recompute when dependencies change.

  // Fetch personalised opening message from the backend on first open.
  useEffect(() => {
    if (!isOpen || !canChat || fetchedOpening.current) return;
    fetchedOpening.current = true;
    api.get('/api/chat/opening-message')
      .then(res => {
        const greeting = res.data?.message;
        if (greeting) {
          setMessages([{ id: 'w0', role: 'model', content: greeting }]);
        }
      })
      .catch(() => {
        // Silently fall back to the hardcoded seed message already in state.
      });
  }, [isOpen, canChat]);

  const handleClose = () => { // Define handler that closes the popup.
    setIsOpen(false); // Update state to collapse the popup.
  }; // End close handler.

  const handleOpen = () => { // Define handler that opens the popup.
    setIsOpen(true); // Update state to expand the popup.
  }; // End open handler.

  const handleSend = async (e) => { // Define submit handler to send user input to backend AI.
    e?.preventDefault(); // Prevent default form submission behavior.
    if (!canChat) { // Check if backend role requirements are not met.
      setMessages((prev) => [ // Append an assistant message explaining why chat is unavailable.
        ...prev, // Preserve existing history.
        { id: `w_${Date.now()}_role`, role: 'model', content: 'Please sign in as a patient to use the AI chat.' }, // Provide user-friendly guidance without changing backend.
      ]); // Close setMessages update.
      return; // Stop further execution because we cannot call /api/chat safely.
    } // End role gate.
    if (!inputValue.trim() || loadingChat) return; // Prevent sending empty messages or while already loading.

    const userMessage = { id: `w_${Date.now()}_u`, role: 'user', content: inputValue.trim() }; // Create the outbound user message object for UI and API context.
    const nextMessages = [...messages, userMessage]; // Append user message to the local history.
    setMessages(nextMessages); // Update UI immediately for responsive messaging.
    setInputValue(''); // Clear the input field after sending.
    setLoadingChat(true); // Show typing indicator while waiting for backend.

    try { // Start guarded network call block.
      const response = await api.post('/api/chat/', { // Call the existing backend endpoint that runs Gemini and returns JSON.
        messages: nextMessages.map((m) => ({ role: m.role, content: m.content })), // Convert UI messages to the backend schema expected by ChatRequest.
      }); // End request body.
      const data = response.data; // Extract payload including message and optional recommendation.

      setMessages((prev) => [ // Append AI response into the existing history.
        ...prev, // Preserve all previous messages.
        { id: `w_${Date.now()}_a`, role: 'model', content: data.message || '' }, // Render AI text message bubble.
      ]); // Close setMessages update.

      setRecommendation(data.recommendation || null); // Store specialty recommendation so the card can render after the AI replies.
    } catch (error) { // Handle request failures such as network/auth errors.
      console.error(error); // Use the catch binding so eslint no-unused-vars does not fail.
      setMessages((prev) => [ // Append assistant fallback so the chat doesn't appear broken.
        ...prev, // Preserve existing messages.
        { id: `w_${Date.now()}_err`, role: 'model', content: 'Sorry—something went wrong. Please try again.' }, // Provide graceful error feedback.
      ]); // Close setMessages update.
      setRecommendation(null); // Clear recommendation because the AI didn't successfully respond.
    } finally { // Ensure loading state resets even when errors occur.
      setLoadingChat(false); // Hide typing indicator after response/error.
    } // End finally.
  }; // End handleSend.

  const severityPill = (severity) => { // Define a helper that returns a severity badge with the required color mapping.
    if (severity === 'low') return 'bg-emerald-100 text-emerald-700 border-emerald-200'; // Set green for low.
    if (severity === 'medium') return 'bg-amber-100 text-amber-700 border-amber-200'; // Set amber for medium.
    if (severity === 'high') return 'bg-red-100 text-red-700 border-red-200'; // Set red for high.
    return 'bg-slate-100 text-slate-700 border-slate-200'; // Fall back to neutral styling if severity is missing/unknown.
  }; // End severityPill helper.

  const widgetButton = ( // Define the floating bot launcher button.
    <button // Use a native button for accessibility and click support.
      type="button" // Ensure this button does not submit any form.
      onClick={handleOpen} // Open the popup when clicked.
      className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary shadow-lg ai-widget-pulse transition-transform hover:opacity-95 active:scale-95" // Apply indigo circular styling and pulse attention ring.
      aria-label="Open HEALTHBIRCH AI chat" // Provide an accessible label.
    > {/* Keep braces to satisfy JSX syntax while using inline comments for clarity. */}
      <Bot className="h-6 w-6 text-white" /> {/* Render the white bot icon inside the button. */}
    </button> // Close the widgetButton element.
  ); // End widgetButton.

  return ( // Return the widget UI (launcher + popup panel).
    <> {/* Use a React fragment so fixed elements don't require extra wrappers. */}
      {widgetButton} {/* Render the fixed bottom-right bot button on all pages. */}
      <div // Render the popup panel container anchored above the launcher.
        className={`fixed bottom-24 right-4 z-50 w-[380px] overflow-hidden rounded-2xl bg-white/95 backdrop-blur-xl border border-indigo-100 shadow-[0_20px_60px_-15px_rgba(99,102,241,0.3)] transition-all duration-300 ${isOpen ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0 pointer-events-none'}`}
        style={{ pointerEvents: isOpen ? 'auto' : 'none' }} // Apply smooth open/close scale + opacity transitions and disable interaction when closed.
        aria-hidden={!isOpen} // Mark as hidden for screen readers when collapsed.
      > {/* Close popup container. */}
        <div className="flex items-center justify-between border-b border-indigo-50 bg-gradient-to-r from-white to-blue-50/50 px-4 py-3"> {/* Render popup header with border per spec. */}
          <div className="flex items-center gap-1.5 opacity-80 transition-opacity hover:opacity-100"> {/* Header right icons/status group. */}
            <Sparkles className="h-4 w-4 text-primary" /> {/* Add small decorative sparkle matching header polish. */}
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Beta</span> {/* Render AI beta tag. */}
          </div> {/* End header right group. */}
          <button // Provide an explicit close control as requested.
            type="button" // Ensure this is a regular button action.
            onClick={handleClose} // Close the popup when clicked.
            className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-gray-50" // Use subtle hover background and keep it rounded.
            aria-label="Close AI chat" // Provide accessible close label.
          > <X className="h-4 w-4 text-slate-600" /> </button> {/* Render lucide X icon for close action. */}
        </div> {/* End popup header. */}

        <div className="flex h-[500px] flex-col"> {/* Create a fixed-height chat layout matching spec dimensions. */}
          <div className="flex-1 overflow-y-auto p-4"> {/* Make the message area scrollable and occupy remaining space. */}
            <div className="space-y-3"> {/* Stack message bubbles with vertical spacing. */}
              {messages.map((msg, idx) => ( // Render each chat message from local state.
                <div // Wrapper ensures animation applies per bubble.
                  key={msg.id} // Use stable id keys so animation triggers only on new messages.
                  className={`chat-fade-up`} // Apply fade-in from bottom animation class.
                  style={{ animationDelay: `${Math.min(idx * 50, 250)}ms` }} // Stagger bubbles slightly so they appear naturally.
                > {/* Close bubble animation wrapper. */}
                  <div // Render bubble with alignment and styling based on role.
                    className={msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai'} // Use indigo right bubbles for patient and white left bubbles for AI.
                  > {/* Close bubble classes. */}
                    {msg.content} {/* Output message text payload. */}
                  </div> {/* Close bubble element. */}
                </div> // Close animated wrapper.
              ))} {/* Close map of messages. */}

              {loadingChat && ( // Conditionally show typing indicator while waiting for AI response.
                <div className="chat-fade-up chat-bubble-ai flex w-fit items-center gap-2 self-start"> {/* Style typing indicator like a left bubble. */}
                  <span className="text-xs font-medium text-slate-500">AI is typing</span> {/* Provide small label for clarity. */}
                  <span className="flex items-center gap-1" aria-label="Typing indicator"> {/* Provide container for bouncing dots. */}
                    <span className="typing-dot h-2 w-2 rounded-full bg-slate-400" style={{ animationDelay: '0ms' }} /> {/* Dot 1. */}
                    <span className="typing-dot h-2 w-2 rounded-full bg-slate-400" style={{ animationDelay: '120ms' }} /> {/* Dot 2. */}
                    <span className="typing-dot h-2 w-2 rounded-full bg-slate-400" style={{ animationDelay: '240ms' }} /> {/* Dot 3. */}
                  </span> {/* Close dots container. */}
                </div> // Close typing indicator wrapper.
              )} {/* End loadingChat conditional. */}
            </div> {/* Close message stack. */}
          </div> {/* Close scrollable message area. */}

          {recommendation && !loadingChat && ( // Render the specialty recommendation card outside the scrollable area.
            <div className="recommendation-slide-up mt-3 max-w-[95%] self-start rounded-2xl border border-white/50 bg-white/70 p-4 shadow-sm backdrop-blur-sm">
              <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3 mb-3">
                <div>
                  <div className="text-sm font-bold text-slate-900 flex items-center gap-1">
                    <ShieldCheck className="w-4 h-4 text-emerald-500"/> AI Triage Assessment
                  </div>
                  <div className="text-sm font-semibold text-primary mt-1">{recommendation.recommendedSpecialty || 'General'}</div>
                  {recommendation.city && <div className="mt-1 text-xs font-semibold text-indigo-500">📍 {recommendation.city}</div>}
                </div>
                <span className={`whitespace-nowrap rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${severityPill(recommendation.severity)}`}>
                  {recommendation.severity || 'low'} Priority
                </span>
              </div>
              <div className="space-y-2">
                 {recommendation.reasoning && (
                   <div className="text-xs text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-100 italic">
                      <span className="font-semibold block not-italic mb-1 text-slate-500">Reasoning:</span>
                      "{recommendation.reasoning}"
                   </div>
                 )}
                 {recommendation.summary && (
                   <div className="text-xs text-slate-600 mt-2">
                      <span className="font-semibold block mb-1 text-slate-500">Symptom Summary:</span>
                      {recommendation.summary}
                   </div>
                 )}
                 {recommendation.disclaimer && (
                   <div className="text-[9px] text-slate-400 mt-2 leading-tight">
                      ⚠️ {recommendation.disclaimer}
                   </div>
                 )}
              </div>
              {recommendation.recommendDoctor !== false ? (
                <button
                  type="button"
                  onClick={() => navigate('/patient/doctors', { state: { goToFind: true, specialty: recommendation.recommendedSpecialty || 'General', city: recommendation.city, recommendation } })}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-primary py-2 text-xs font-bold text-white shadow-sm hover:opacity-90 transition active:scale-95"
                >
                  <Search className="h-3 w-3" /> Book {recommendation.recommendedSpecialty || 'General'}
                </button>
              ) : (
                <div className="mt-3 text-xs text-emerald-600 font-semibold bg-emerald-50 p-2 border border-emerald-100 rounded-lg text-center">
                  No clinic visit recommended. Follow self-care tips.
                </div>
              )}
            </div> // Close recommendation card.
          )} {/* Close recommendation conditional. */}
          <form
            onSubmit={handleSend}
            className="flex flex-shrink-0 items-center gap-2 border-t border-gray-100 bg-white px-4 py-3"
          >
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={canChat ? 'Describe your symptoms...' : 'Sign in as a patient to chat...'}
              disabled={!canChat || loadingChat}
              className="input-base shadow-inner/50 bg-slate-50 border-transparent focus:border-indigo-200"
            /> {/* Close input element. */}
            <button // Render indigo filled send button.
              type="submit" // Submit the form to trigger handleSend.
              disabled={!canSend} // Disable when role invalid, input empty, or loading.
              className={`flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white shadow-sm transition hover:opacity-90 active:scale-95 ${!canSend ? 'opacity-50 cursor-not-allowed' : ''}`} // Apply send button look and disabled behavior.
              aria-label="Send message" // Provide accessible label.
            > <Send className="h-4 w-4" /> </button> {/* Render arrow icon on send action. */}
          </form> {/* Close pinned input form. */}
        </div> {/* Close flex column chat layout. */}
      </div> {/* Close popup wrapper. */}
    </> // End fragment.
  ); // Close widget render.
}; // Close AiChatWidget component definition.

export default AiChatWidget; // Export component so App can render it globally.
