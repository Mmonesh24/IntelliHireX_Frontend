import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import JitsiIframe from "../components/Jitvideo.jsx";
import CodeCompiler from "./code-compiler.jsx";

const WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:8000/ws";

const InterviewerRoom = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // UI state (same visuals as before)
  const [questions, setQuestions] = useState([]); // finalized list
  const [pinnedQuestions, setPinnedQuestions] = useState([]);
  const [hoveredQuestion, setHoveredQuestion] = useState(null);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [questionRatings, setQuestionRatings] = useState({});
  const [activeTab, setActiveTab] = useState("generated");

  const [transcript, setTranscript] = useState([]); // just to show some system lines for coding challenge actions
  const [sentimentScore, setSentimentScore] = useState(75);

  const [resumeData, setResumeData] = useState(null);
  const [selectedSkill, setSelectedSkill] = useState(null);

  const [showCodingModal, setShowCodingModal] = useState(false);
  const [codingChallenge, setCodingChallenge] = useState(null);
  const [showCompiler, setShowCompiler] = useState(false);

  const [showRubricModal, setShowRubricModal] = useState(false);
  const [rubricScores, setRubricScores] = useState({});

  // WS & live streaming sets
  const wsRef = useRef(null);
  const [streamingSets, setStreamingSets] = useState({}); // { [id]: { text, done } }

  // Connect WS as interviewer
  useEffect(() => {
    if (!id) return;
    try { wsRef.current?.close(); } catch {}

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "hello", role: "interviewer", interview_id: String(id) }));
    };

    ws.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data);
        const t = data.type;

        if (t === "ai_start") {
          setStreamingSets((prev) => ({ ...prev, [data.id]: { text: "", done: false } }));
        } else if (t === "ai_stream") {
          setStreamingSets((prev) => {
            const curr = prev[data.id]?.text || "";
            return { ...prev, [data.id]: { text: curr + (data.text || ""), done: false } };
          });
        } else if (t === "ai_list") {
          const items = Array.isArray(data.items) ? data.items : [];
          setQuestions((prev) => [...items, ...prev]); // prepend
        } else if (t === "ai_done" || t === "ai_cancel" || t === "error") {
          setStreamingSets((prev) => ({ ...prev, [data.id]: { ...(prev[data.id] || { text: "" }), done: true } }));
        }
      } catch (e) {
        console.error("WS message parse error:", e);
      }
    };

    ws.onerror = (err) => console.error("WS error:", err);
    ws.onclose = () => {};

    return () => {
      try { ws.close(); } catch {}
    };
  }, [id]);

  // Mock resume data (same as before)
  useEffect(() => {
    setResumeData({
      name: "John Doe",
      email: "john.doe@example.com",
      phone: "(123) 456-7890",
      education: [
        { institution: "Stanford University", degree: "Master of Science in Computer Science", year: "2018-2020" },
        { institution: "MIT", degree: "Bachelor of Science in Computer Science", year: "2014-2018" },
      ],
      experience: [
        {
          company: "Google",
          position: "Software Engineer",
          duration: "2020-Present",
          description:
            "Developed and maintained cloud infrastructure services. Implemented microservices architecture using Kubernetes and Docker.",
        },
        {
          company: "Amazon",
          position: "Software Development Intern",
          duration: "Summer 2019",
          description:
            "Worked on improving recommendation algorithms. Implemented A/B testing framework for new features.",
        },
      ],
      skills: [
        { name: "JavaScript", level: "Expert" },
        { name: "React", level: "Expert" },
        { name: "Node.js", level: "Advanced" },
        { name: "Python", level: "Advanced" },
        { name: "Machine Learning", level: "Intermediate" },
      ],
    });

    return () => {};
  }, []);

  // Demo sentiment bar tick
  useEffect(() => {
    const t = setInterval(() => {
      setSentimentScore((s) => {
        const n = s + (Math.random() * 8 - 4);
        return Math.max(10, Math.min(95, Math.round(n)));
      });
    }, 3000);
    return () => clearInterval(t);
  }, []);

  // Handlers
  const handlePinQuestion = (q) => { setPinnedQuestions((prev) => [...prev, q]); setQuestions((prev) => prev.filter((x) => x !== q)); };
  const handleDismissQuestion = (q) => setQuestions((prev) => prev.filter((x) => x !== q));
  const handleUnpinQuestion = (q) => setPinnedQuestions((prev) => prev.filter((x) => x !== q));
  const handleRateQuestion = (question, rating) => setQuestionRatings((prev) => ({ ...prev, [question]: rating }));
  const handleOpenCodingChallenge = () => setShowCodingModal(true);
  const handleSubmitCodingChallenge = (challenge) => {
    setCodingChallenge(challenge);
    setShowCodingModal(false);
    setTranscript((prev) => [...prev, { speaker: "Interviewer", text: `I've sent you a coding challenge: "${challenge.title}".` }]);
  };
  const handleReturnToInterview = () => setShowCompiler(false);
  const handleEndInterview = () => setShowRubricModal(true);

  const StarRating = ({ question, currentRating, onRate }) => (
    <div className="flex items-center space-x-1 mt-2 transition-all duration-300 ease-in-out">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          onClick={() => onRate(question, star)}
          className="focus:outline-none transform transition-transform duration-200 hover:scale-125"
        >
          <svg
            className={`w-5 h-5 ${star <= currentRating ? "text-yellow-400 fill-current" : "text-gray-400"}`}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
          >
            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
          </svg>
        </button>
      ))}
      <span className="text-xs text-gray-300 ml-1">{currentRating > 0 ? `${currentRating}/5` : ""}</span>
    </div>
  );

  if (showCompiler) return <CodeCompiler challenge={codingChallenge} onReturn={handleReturnToInterview} />;

  const displayQuestions = questions.filter((q) => q && q.trim() !== "");

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-black/80 backdrop-blur-md p-4 border-b border-gray-800 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <div className="bg-gradient-to-r from-pink-600 to-purple-600 p-2 rounded-lg">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold">Interview Session #{id}</h1>
            <p className="text-gray-400 text-sm">Software Engineer Position</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={handleOpenCodingChallenge}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white font-medium transition-all transform hover:scale-105 flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/>
            </svg>
            Post Coding Challenge
          </button>
          <button
            onClick={handleEndInterview}
            className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 transition-colors"
          >
            End Interview
          </button>
        </div>
      </div>

      {/* Main */}
      <div className="grid grid-cols-12 gap-4 p-4 h-[calc(100vh-72px)]">
        {/* Left: Questions & live streaming */}
        <div className="col-span-3 bg-gray-800/50 backdrop-blur-md rounded-xl border border-gray-700 p-4 flex flex-col h-full">
          {selectedQuestion ? (
            <div className="flex flex-col h-full">
              <div className="flex-grow overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-bold">Selected Question</h2>
                  <button onClick={() => setSelectedQuestion(null)} className="p-2 hover:bg-gray-700 rounded-lg">✕</button>
                </div>
                <div className="bg-gray-700/50 p-3 rounded-lg mb-4">
                  <p className="text-gray-200 mb-4">{selectedQuestion}</p>
                  <StarRating
                    question={selectedQuestion}
                    currentRating={questionRatings[selectedQuestion] || 0}
                    onRate={(q, rating) => { setQuestionRatings((p) => ({ ...p, [q]: rating })); setSelectedQuestion(null); }}
                  />
                </div>
              </div>
              <div className="border-t border-gray-700 pt-4">
                <button
                  onClick={() => { const followUp = `${selectedQuestion} (Follow-up)`; setQuestions((p) => [followUp, ...p]); setSelectedQuestion(null); }}
                  className="w-full mb-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg"
                >
                  Generate Follow-up
                </button>
                <button onClick={() => setSelectedQuestion(null)} className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg">
                  Close
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold">Questions</h2>
              </div>

              {/* Live streaming sets */}
              <div className="space-y-3 mb-3 overflow-y-auto max-h-48">
                {Object.entries(streamingSets)
                  .sort((a,b) => Number(a[0]) < Number(b[0]) ? 1 : -1)
                  .map(([sid, obj]) => (
                  <div key={sid} className="bg-gray-700/40 p-3 rounded-lg border border-gray-600">
                    <p className="text-xs text-gray-400 mb-1">Live set #{sid}</p>
                    <p className="text-sm text-gray-200 whitespace-pre-wrap">{obj.text || "…"}</p>
                    {!obj.done && (
                      <div className="mt-1 flex space-x-1">
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay:"0.2s"}}></span>
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay:"0.4s"}}></span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Tabs */}
              <div className="flex justify-center mb-4">
                <button
                  onClick={() => setActiveTab("generated")}
                  className={`px-4 py-2 rounded-lg mx-2 ${activeTab === "generated" ? "bg-purple-600 text-white" : "bg-gray-700 text-gray-300"} transition-colors`}
                >
                  Generated
                </button>
                <button
                  onClick={() => setActiveTab("questionBank")}
                  className={`px-4 py-2 rounded-lg mx-2 ${activeTab === "questionBank" ? "bg-purple-600 text-white" : "bg-gray-700 text-gray-300"} transition-colors`}
                >
                  Question Bank
                </button>
              </div>

              {activeTab === "generated" && (
                <div className="space-y-3 mb-6 overflow-y-auto flex-grow">
                  {displayQuestions.length > 0 ? (
                    displayQuestions.map((question, idx) => (
                      <div
                        key={`${question}-${idx}`}
                        className="bg-gray-700/50 p-3 rounded-lg border border-gray-600 hover:border-purple-500 transition-colors group"
                        onMouseEnter={() => setHoveredQuestion(question)}
                        onMouseLeave={() => setHoveredQuestion(null)}
                        onClick={() => setSelectedQuestion(question)}
                      >
                        <p className="text-sm text-gray-200 mb-2">{question}</p>
                        <StarRating question={question} currentRating={questionRatings[question] || 0} onRate={handleRateQuestion} />
                        <div className="flex justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => { e.stopPropagation(); handlePinQuestion(question); }}
                            className="p-1 rounded bg-gray-600 hover:bg-gray-500 transition-colors" title="Pin Question"
                          >
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/>
                            </svg>
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDismissQuestion(question); }}
                            className="p-1 rounded bg-gray-600 hover:bg-gray-500 transition-colors" title="Dismiss Question"
                          >
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      <p>No questions available yet.</p>
                      <p className="text-sm mt-2">Questions will appear automatically as the candidate speaks.</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "questionBank" && (
                <div className="space-y-3 mb-6 overflow-y-auto flex-grow">
                  {[
                    "What is your greatest strength?",
                    "Describe a time you faced a challenge at work.",
                    "How do you prioritize your tasks?",
                    "What are your career goals?",
                    "Why do you want to work here?",
                  ].map((q, index) => (
                    <div
                      key={index}
                      className="bg-gray-700/50 p-3 rounded-lg border border-gray-600 hover:border-purple-500 transition-colors group"
                      onMouseEnter={() => setHoveredQuestion(q)}
                      onMouseLeave={() => setHoveredQuestion(null)}
                      onClick={() => setSelectedQuestion(q)}
                    >
                      <p className="text-sm text-gray-200 mb-2">{q}</p>
                      <StarRating question={q} currentRating={questionRatings[q] || 0} onRate={handleRateQuestion} />
                      <div className="flex justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => { e.stopPropagation(); handlePinQuestion(q); }}
                          className="p-1 rounded bg-gray-600 hover:bg-gray-500 transition-colors" title="Pin Question"
                        >
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/>
                          </svg>
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDismissQuestion(q); }}
                          className="p-1 rounded bg-gray-600 hover:bg-gray-500 transition-colors" title="Dismiss Question"
                        >
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {pinnedQuestions.length > 0 && (
                <div>
                  <h3 className="text-md font-bold mb-2 text-purple-300">Pinned Questions</h3>
                  <div className="space-y-3">
                    {pinnedQuestions.map((q, index) => (
                      <div
                        key={index}
                        className="bg-purple-900/30 p-3 rounded-lg border border-purple-600 group"
                        onMouseEnter={() => setHoveredQuestion(q)}
                        onMouseLeave={() => setHoveredQuestion(null)}
                        onClick={() => setSelectedQuestion(q)}
                      >
                        <p className="text-sm text-gray-200 mb-2">{q}</p>
                        <StarRating question={q} currentRating={questionRatings[q] || 0} onRate={handleRateQuestion} />
                        <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleUnpinQuestion(q); }}
                            className="p-1 rounded bg-purple-700 hover:bg-purple-600 transition-colors" title="Unpin Question"
                          >
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Center: Video + transcript (system lines) */}
        <div className="col-span-6 flex flex-col h-full">
          {/* Video */}
          <div className="bg-black rounded-xl overflow-hidden mb-4 relative aspect-video">
            <JitsiIframe />
            <div className="absolute bottom-4 right-4 bg-black/70 backdrop-blur-sm p-2 rounded-lg">
              <div className="flex items-center space-x-2">
                <span className="text-sm">Sentiment:</span>
                <div className="w-32 h-3 bg-gray-700 rounded-full overflow-hidden">
                  <div className={`h-full ${sentimentScore > 70 ? "bg-green-500" : sentimentScore > 40 ? "bg-yellow-500" : "bg-red-500"}`} style={{ width: `${sentimentScore}%` }}></div>
                </div>
                <span className="text-sm font-medium">{sentimentScore}%</span>
              </div>
            </div>
          </div>

          {/* Transcript (system notices/coding challenge posts) */}
          <div className="bg-gray-800/50 backdrop-blur-md rounded-xl border border-gray-700 p-4 flex-grow overflow-hidden flex flex-col">
            <h2 className="text-lg font-bold mb-4">Live Transcript</h2>
            <div className="overflow-y-auto flex-grow space-y-4 pr-2">
              {transcript.length > 0 ? (
                transcript.map((entry, idx) => (
                  <div key={idx} className="flex justify-start">
                    <div className="max-w-[80%] p-3 rounded-lg bg-gray-700 text-white rounded-tl-none">
                      <p className="text-xs font-bold mb-1 opacity-70">{entry.speaker}</p>
                      <p className="text-sm">{entry.text}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <p>No interviewer notes yet.</p>
                  <p className="text-sm mt-2">AI question suggestions appear on the left panel.</p>
                </div>
              )}
              {/* Typing dots (visual continuity) */}
              <div className="flex justify-start">
                <div className="max-w-[80%] p-3 rounded-lg bg-gray-700 text-white rounded-tl-none">
                  <p className="text-xs font-bold mb-1 opacity-70">Interviewer</p>
                  <div className="flex space-x-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></span>
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.4s" }}></span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Resume */}
        <div className="col-span-3 bg-gray-800/50 backdrop-blur-md rounded-xl border border-gray-700 p-4 overflow-y-auto h-full">
          <h2 className="text-lg font-bold mb-4">Candidate Resume</h2>

          {resumeData && (
            <div className="space-y-6">
              <div className="border-b border-gray-700 pb-4">
                <h3 className="text-xl font-bold text-purple-300">{resumeData.name}</h3>
                <p className="text-gray-300 text-sm">{resumeData.email}</p>
                <p className="text-gray-300 text-sm">{resumeData.phone}</p>
              </div>

              <div>
                <h4 className="text-md font-bold mb-2 text-purple-300">Skills</h4>
                <div className="flex flex-wrap gap-2">
                  {resumeData.skills.map((skill, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedSkill(skill)}
                      className={`px-3 py-1 text-sm rounded-full transition-colors ${
                        selectedSkill && selectedSkill.name === skill.name ? "bg-purple-600 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                      }`}
                    >
                      {skill.name}
                    </button>
                  ))}
                </div>

                {selectedSkill && (
                  <div className="mt-4 p-3 bg-purple-900/30 rounded-lg border border-purple-600">
                    <h5 className="font-medium text-purple-300">
                      {selectedSkill.name} - {selectedSkill.level}
                    </h5>
                    <div className="mt-2 space-y-2">
                      <p className="text-sm text-gray-300">Suggested questions:</p>
                      <ul className="text-sm text-gray-300 list-disc pl-5 space-y-1">
                        <li>Can you describe a project where you used {selectedSkill.name}?</li>
                        <li>What challenges have you faced with {selectedSkill.name}?</li>
                        <li>How do you stay updated with the latest developments in {selectedSkill.name}?</li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-md font-bold mb-2 text-purple-300">Experience</h4>
                <div className="space-y-4">
                  {resumeData.experience.map((exp, i) => (
                    <div key={i} className="p-3 bg-gray-700/50 rounded-lg border border-gray-600 hover:border-purple-500 transition-colors">
                      <h5 className="font-medium">{exp.position}</h5>
                      <p className="text-sm text-purple-300">{exp.company} | {exp.duration}</p>
                      <p className="text-sm text-gray-300 mt-1">{exp.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-md font-bold mb-2 text-purple-300">Education</h4>
                <div className="space-y-4">
                  {resumeData.education.map((edu, i) => (
                    <div key={i} className="p-3 bg-gray-700/50 rounded-lg border border-gray-600 hover:border-purple-500 transition-colors">
                      <h5 className="font-medium">{edu.degree}</h5>
                      <p className="text-sm text-purple-300">{edu.institution} | {edu.year}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Coding Challenge Modal (interviewer only) */}
      {showCodingModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl border border-purple-500/30 p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6 text-center bg-clip-text text-transparent bg-gradient-to-r from-pink-400 via-purple-400 to-indigo-400">
              Create Coding Challenge
            </h2>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                const challenge = {
                  title: formData.get("title"),
                  description: formData.get("description"),
                  difficulty: formData.get("difficulty"),
                  starterCode: formData.get("starterCode"),
                  testCases: formData.get("testCases").toString().split("\n").filter(Boolean),
                  expectedOutputs: formData.get("expectedOutputs").toString().split("\n").filter(Boolean),
                  timeLimit: Number.parseInt(formData.get("timeLimit")),
                  language: formData.get("language"),
                };
                handleSubmitCodingChallenge(challenge);
              }}
            >
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-300">Title</label>
                    <input
                      name="title"
                      defaultValue="Two Sum"
                      className="w-full px-4 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-300">Difficulty</label>
                    <select
                      name="difficulty"
                      className="w-full px-4 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    >
                      <option>Easy</option>
                      <option>Medium</option>
                      <option>Hard</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-300">Description</label>
                  <textarea
                    name="description"
                    defaultValue="Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target..."
                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none h-32"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-300">Language</label>
                    <select
                      name="language"
                      className="w-full px-4 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    >
                      <option value="javascript">JavaScript</option>
                      <option value="python">Python</option>
                      <option value="java">Java</option>
                      <option value="cpp">C++</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-300">Time Limit (seconds)</label>
                    <input
                      type="number"
                      name="timeLimit"
                      defaultValue="5"
                      min="1"
                      max="30"
                      className="w-full px-4 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-300">Starter Code</label>
                  <textarea
                    name="starterCode"
                    defaultValue={`function twoSum(nums, target) {\n  // Your code here\n}`}
                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none h-32 font-mono"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-300">Test Cases (one per line)</label>
                    <textarea
                      name="testCases"
                      defaultValue={`[2,7,11,15], 9\n[3,2,4], 6\n[3,3], 6`}
                      className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none h-32 font-mono"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-300">Expected Outputs (one per line)</label>
                    <textarea
                      name="expectedOutputs"
                      defaultValue={`[0,1]\n[1,2]\n[0,1]`}
                      className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none h-32 font-mono"
                      required
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-4 pt-4 border-t border-gray-700">
                  <button
                    type="button"
                    onClick={() => setShowCodingModal(false)}
                    className="px-6 py-3 rounded-lg bg-gray-700 hover:bg-gray-600 text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-3 rounded-lg bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-500 hover:to-teal-500 text-white transition-colors"
                  >
                    Send to Candidate
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rubric Modal */}
      {showRubricModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl border border-purple-500/30 p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6 text-center bg-clip-text text-transparent bg-gradient-to-r from-pink-400 via-purple-400 to-indigo-400">
              Candidate Evaluation
            </h2>

            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold mb-3 text-purple-300">Technical Skills</h3>
                <div className="space-y-4">
                  {["JavaScript", "React", "Problem Solving", "System Design"].map((skill) => (
                    <div key={skill} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-sm font-medium text-gray-300">{skill}</label>
                        <span className="text-sm text-gray-400">{rubricScores[skill] || 0}/5</span>
                      </div>
                      <div className="flex space-x-2">
                        {[1, 2, 3, 4, 5].map((score) => (
                          <button
                            key={score}
                            onClick={() => setRubricScores((p) => ({ ...p, [skill]: score }))}
                            className={`w-full py-2 rounded-md transition-colors ${rubricScores[skill] === score ? "bg-purple-600 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"}`}
                          >
                            {score}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold mb-3 text-purple-300">Soft Skills</h3>
                <div className="space-y-4">
                  {["Communication", "Teamwork", "Adaptability", "Confidence"].map((skill) => (
                    <div key={skill} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-sm font-medium text-gray-300">{skill}</label>
                        <span className="text-sm text-gray-400">{rubricScores[skill] || 0}/5</span>
                      </div>
                      <div className="flex space-x-2">
                        {[1, 2, 3, 4, 5].map((score) => (
                          <button
                            key={score}
                            onClick={() => setRubricScores((p) => ({ ...p, [skill]: score }))}
                            className={`w-full py-2 rounded-md transition-colors ${rubricScores[skill] === score ? "bg-purple-600 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"}`}
                          >
                            {score}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold mb-3 text-purple-300">Question Ratings</h3>
                <div className="space-y-4">
                  {Object.keys(questionRatings).length > 0 ? (
                    Object.entries(questionRatings).map(([q, rating]) => (
                      <div key={q} className="p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                        <p className="text-sm text-gray-200 mb-2">{q}</p>
                        <div className="flex items-center">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <svg
                              key={star}
                              className={`w-5 h-5 ${star <= rating ? "text-yellow-400 fill-current" : "text-gray-400"}`}
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                            >
                              <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                            </svg>
                          ))}
                          <span className="text-sm text-gray-300 ml-2">{rating}/5</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-400 text-center py-4">No questions have been rated yet</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Additional Comments</label>
                <textarea
                  className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none h-32"
                  placeholder="Add any additional feedback or notes about the candidate..."
                ></textarea>
              </div>

              <div className="flex justify-end space-x-4 pt-4 border-t border-gray-700">
                <button
                  onClick={() => setShowRubricModal(false)}
                  className="px-6 py-3 rounded-lg bg-gray-700 hover:bg-gray-600 text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => { setShowRubricModal(false); navigate("/interviewer-dashboard"); }}
                  className="px-6 py-3 rounded-lg bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white transition-colors"
                >
                  Submit Evaluation & End Interview
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InterviewerRoom;
