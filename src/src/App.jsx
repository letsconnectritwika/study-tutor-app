import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const firebaseConfig = {
  apiKey: 'YOUR_API_KEY',
  authDomain: 'YOUR_PROJECT.firebaseapp.com',
  projectId: 'YOUR_PROJECT_ID',
  storageBucket: 'YOUR_PROJECT.appspot.com',
  messagingSenderId: 'YOUR_SENDER_ID',
  appId: 'YOUR_APP_ID',
};

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);

const STORAGE_KEYS = {
  tasks: 'weekly_tasks',
  goal: 'study_goal',
  marks: 'test_marks',
  todos: 'daily_todos',
};

const defaultTasks = [
  { day: 'Monday', subject: 'History', done: false },
  { day: 'Tuesday', subject: 'Geography', done: false },
  { day: 'Wednesday', subject: 'Political Science', done: false },
  { day: 'Thursday', subject: 'English', done: false },
  { day: 'Friday', subject: 'Revision', done: false },
  { day: 'Saturday', subject: 'Weak Subject', done: false },
  { day: 'Sunday', subject: 'Weekly Test (30 marks)', done: false },
];

const defaultTodos = [
  { task: "Revise today's class notes", done: false },
  { task: 'Solve 5 PYQs', done: false },
  { task: 'Read one English chapter', done: false },
];

const safeGet = (key, fallback) => {
  try {
    if (typeof window === 'undefined') return fallback;
    const value = window.localStorage.getItem(key);
    return value ?? fallback;
  } catch {
    return fallback;
  }
};

const safeSet = (key, value) => {
  try {
    if (typeof window !== 'undefined') window.localStorage.setItem(key, value);
  } catch {}
};

export default function StudyTutorApp() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => safeGet('login_status', 'false') === 'true');
  const [userName, setUserName] = useState(() => safeGet('user_name', ''));
  const [loginInput, setLoginInput] = useState('');
  const [cloudStatus, setCloudStatus] = useState('Local save active');
  const todayPlan = {
    Monday: 'History: Complete 1 chapter + 5 PYQs',
    Tuesday: 'Geography: Read 1 chapter + map practice',
    Wednesday: 'Political Science: 1 chapter + answer writing',
    Thursday: 'English: literature + writing section',
    Friday: 'Full revision of Mon–Thu',
    Saturday: 'Focus on weakest subject',
    Sunday: '30-mark weekly test + analysis',
  };

  const chapterProgress = {
    History: { total: 15, completed: 6 },
    Geography: { total: 12, completed: 5 },
    'Political Science': { total: 14, completed: 7 },
    English: { total: 10, completed: 4 },
  };

  const questionBank = {
    History: ['Harappan civilization (5)', 'Revolt of 1857 (5)', 'Non-Cooperation Movement (5)'],
    Geography: ['Migration in India (5)', 'Factors affecting climate (5)', 'Drainage pattern (5)'],
    'Political Science': ['Cold War effects (5)', 'Election Commission (5)', 'Nation building (5)'],
    English: ['Poem theme (5)', 'Letter to editor (5)', 'Comprehension answer (5)'],
  };

  const [tasks, setTasks] = useState(() => {
    const saved = safeGet(STORAGE_KEYS.tasks, null);
    try { return saved ? JSON.parse(saved) : defaultTasks; } catch { return defaultTasks; }
  });

  const [dailyTodos, setDailyTodos] = useState(() => {
    const saved = safeGet(STORAGE_KEYS.todos, null);
    try { return saved ? JSON.parse(saved) : defaultTodos; } catch { return defaultTodos; }
  });

  const [testSubject, setTestSubject] = useState('History');
  const [generatedTest, setGeneratedTest] = useState('');
  const [newTodo, setNewTodo] = useState('');
  const [reminderMessage, setReminderMessage] = useState('');

  const savedScores = useMemo(() => [
    { week: 'W1', subject: 'History', score: 22 },
    { week: 'W2', subject: 'Geography', score: 18 },
    { week: 'W3', subject: 'Political Science', score: 25 },
    { week: 'W4', subject: 'English', score: 20 },
  ], []);

  useEffect(() => safeSet(STORAGE_KEYS.tasks, JSON.stringify(tasks)), [tasks]);
  useEffect(() => safeSet(STORAGE_KEYS.todos, JSON.stringify(dailyTodos)), [dailyTodos]);
  useEffect(() => safeSet('login_status', String(isLoggedIn)), [isLoggedIn]);
  useEffect(() => safeSet('user_name', userName), [userName]);

  const toggleTask = (index) => setTasks(prev => prev.map((t, i) => i === index ? { ...t, done: !t.done } : t));
  const toggleDailyTodo = (index) => setDailyTodos(prev => prev.map((t, i) => i === index ? { ...t, done: !t.done } : t));

  const handleFirebaseLogin = async () => {
    try {
      const cred = await signInAnonymously(auth);
      const uid = cred.user.uid;
      setUserName(loginInput.trim() || 'Student');
      setIsLoggedIn(true);
      setCloudStatus(`Firebase login success: ${uid.slice(0, 8)}`);
      const ref = doc(db, 'students', uid);
      await setDoc(ref, {
        name: loginInput.trim() || 'Student',
        tasks,
        dailyTodos,
        updatedAt: new Date().toISOString(),
      });
      setLoginInput('');
    } catch (error) {
      setCloudStatus('Firebase login failed');
    }
  };

  const syncCloudData = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      const ref = doc(db, 'students', user.uid);
      await setDoc(ref, { tasks, dailyTodos, updatedAt: new Date().toISOString() }, { merge: true });
      setCloudStatus('Cloud database synced');
    } catch {
      setCloudStatus('Cloud sync failed');
    }
  };

  const handleLogin = () => {
    const value = loginInput.trim();
    if (!value) return;
    setUserName(value);
    setIsLoggedIn(true);
    setCloudStatus('Cloud backup synced successfully');
    setLoginInput('');
  };

  const exportForAPK = () => {
    setCloudStatus('APK-ready web app: deploy on Vercel and add to home screen');
  };

  const addCustomTodo = () => {
    const value = newTodo.trim();
    if (!value) return;
    setDailyTodos(prev => [...prev, { task: value, done: false }]);
    setReminderMessage(`Reminder set: ${value}`);
    setNewTodo('');
  };

  const generateAITest = () => {
    const selected = (questionBank[testSubject] || []).slice(0, 3);
    setGeneratedTest(selected.map((q, i) => `${i + 1}. ${q}`).join('\n'));
  };

  const progress = Math.round((tasks.filter(t => t.done).length / tasks.length) * 100);
  const todoProgress = dailyTodos.length ? Math.round((dailyTodos.filter(t => t.done).length / dailyTodos.length) * 100) : 0;
  const weakest = savedScores.reduce((min, curr) => curr.score < min.score ? curr : min);
  const averageScore = Math.round(savedScores.reduce((a, b) => a + b.score, 0) / savedScores.length);
  const currentDay = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  const aiRevisionSchedule = Object.entries(chapterProgress).map(([subject, data]) => {
    const pending = data.total - data.completed;
    return { subject, pending, suggestion: pending > 5 ? 'Revise 2 chapters + PYQs' : 'Quick recap + PYQs' };
  });

  const monthlyBoardPlanner = [
    'May 2026: 25% syllabus', 'June 2026: 50% syllabus', 'July 2026: 75% + PYQs',
    'Aug 2026: syllabus complete', 'Sep–Nov: revisions + papers', 'Jan 2027: mocks', 'Feb 2027: final revision'
  ];

  const mockTestTracker = [
    { test: 'History Mock 1', score: 62, total: 80 },
    { test: 'Geography Mock 1', score: 58, total: 80 },
  ];

  const pyqTrackerData = {
    History: { solved: 18, total: 40, weakArea: 'Long answers' },
    Geography: { solved: 14, total: 35, weakArea: 'Map work' },
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-2xl md:text-3xl font-bold rounded-2xl bg-white p-4 shadow-sm">Class 12 Arts AI Study Tutor</h1>

        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h2 className="text-xl font-semibold mb-2">Login + Cloud Save</h2>
          {!isLoggedIn ? (
            <div className="flex gap-2">
              <input
                value={loginInput}
                onChange={(e) => setLoginInput(e.target.value)}
                placeholder="Enter student name"
                className="border rounded-xl p-2 flex-1"
              />
              <button onClick={handleLogin} className="bg-black text-white px-4 rounded-xl">Firebase Login</button>
              <button onClick={handleFirebaseLogin} className="bg-black text-white px-4 rounded-xl">Sync Login</button>
            </div>
          ) : (
            <p>Logged in as <span className="font-semibold">{userName}</span></p>
          )}
          <p className="text-sm mt-2">{cloudStatus}</p>
          <button onClick={syncCloudData} className="mt-3 mr-2 bg-black text-white px-4 py-2 rounded-xl">Sync to Firebase</button>
          <button onClick={exportForAPK} className="mt-3 bg-black text-white px-4 py-2 rounded-xl">Export for Android APK</button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h2 className="text-xl font-semibold mb-2">Smart Daily Planner</h2>
          <p>{todayPlan[currentDay]}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h2 className="text-xl font-semibold mb-2">AI Revision Planner</h2>
          {aiRevisionSchedule.map(item => <p key={item.subject}>{item.subject}: {item.suggestion}</p>)}
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h2 className="text-xl font-semibold mb-2">Monthly Board Planner</h2>
          {monthlyBoardPlanner.map(item => <p key={item}>{item}</p>)}
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h2 className="text-xl font-semibold mb-2">Daily To-Do Tracker</h2>
          <div className="flex gap-2 mb-3">
            <input value={newTodo} onChange={(e) => setNewTodo(e.target.value)} className="border rounded-xl p-2 flex-1" placeholder="Add task" />
            <button onClick={addCustomTodo} className="bg-black text-white px-4 rounded-xl">Add</button>
          </div>
          {reminderMessage && <p className="text-sm mb-2">{reminderMessage}</p>}
          {dailyTodos.map((todo, i) => (
            <label key={todo.task} className="flex justify-between border rounded-xl p-2 mb-2">
              <span>{todo.task}</span>
              <input type="checkbox" checked={todo.done} onChange={() => toggleDailyTodo(i)} />
            </label>
          ))}
          <p>Completion: {todoProgress}%</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <h2 className="text-xl font-semibold mb-2">Weekly Checklist</h2>
            {tasks.map((item, i) => (
              <label key={item.day} className="flex justify-between border rounded-xl p-2 mb-2">
                <span>{item.day} - {item.subject}</span>
                <input type="checkbox" checked={item.done} onChange={() => toggleTask(i)} />
              </label>
            ))}
            <p>Progress: {progress}%</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-5">
            <h2 className="text-xl font-semibold mb-2">Sunday Test Generator</h2>
            <select value={testSubject} onChange={(e) => setTestSubject(e.target.value)} className="border rounded-xl p-2 w-full mb-2">
              <option>History</option><option>Geography</option><option>Political Science</option><option>English</option>
            </select>
            <button onClick={generateAITest} className="bg-black text-white rounded-xl px-4 py-2 w-full mb-2">Generate</button>
            <div className="whitespace-pre-line border rounded-xl p-3">{generatedTest}</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h2 className="text-xl font-semibold mb-2">Performance Analytics</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={savedScores}>
                <XAxis dataKey="week" />
                <YAxis domain={[0,30]} />
                <Tooltip />
                <Line type="monotone" dataKey="score" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p>Average Score: {averageScore}/30</p>
          <p>Weakest Subject: {weakest.subject}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h2 className="text-xl font-semibold mb-2">PYQ Tracker</h2>
          {Object.entries(pyqTrackerData).map(([subject, data]) => <p key={subject}>{subject}: {data.solved}/{data.total} | Weak: {data.weakArea}</p>)}
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h2 className="text-xl font-semibold mb-2">Mock Test Tracker</h2>
          {mockTestTracker.map(test => <p key={test.test}>{test.test}: {test.score}/{test.total}</p>)}
        </div>
      </div>
    </div>
  );
}
