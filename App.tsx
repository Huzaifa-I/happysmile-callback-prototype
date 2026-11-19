import React, { useEffect, useMemo, useRef, useState } from 'react';

type Status = 'booked' | 'staff' | 'noanswer' | 'calling' | 'scheduled';
type QA = { q: string; a: string };
type Lead = {
    id: number; name: string; phone: string; treatment: string; clinic: string; when: string;
    status: Status; calledIn: string; calledSecs?: number; received: string; slot?: string; reason?: string; wait?: string;
    summary: string; transcript: { who: 'AI' | 'Patient'; text: string }[]; live?: boolean; resolved?: boolean; scheduledFor?: string;
    answers: QA[]; language: string; urgent?: boolean; nervous?: boolean; notes: string[]; busy?: boolean; rescheduled?: boolean;
};

const TREATMENTS = ['Teeth cleaning', 'Braces / aligners', 'Root canal', 'Implants', 'Whitening', 'Not sure yet'];
const CLINICS = ['Indiranagar', 'Koramangala', 'Andheri West', 'Banjara Hills'];
const LANGS = ['English', 'Hindi'];
const QUESTIONS: Record<string, { q: string; o: string[] }[]> = {
    'Teeth cleaning': [{ q: 'When was your last dental check-up?', o: ['Within 6 months', '6 to 12 months', 'Over a year ago', 'Never had one'] }, { q: 'Any sensitivity or bleeding gums?', o: ['No', 'Sensitive teeth', 'Bleeding gums', 'Both'] }],
    'Braces / aligners': [{ q: 'Have you worn braces or aligners before?', o: ['Never', 'Yes, as a teenager', 'Yes, recently'] }, { q: 'What matters most to you?', o: ['A discreet look', 'Shortest treatment', 'Lowest cost', 'Not sure yet'] }],
    'Root canal': [{ q: 'How is the pain right now?', o: ['No pain', 'Mild, comes and goes', 'Severe or constant'] }, { q: 'Any facial swelling or fever?', o: ['No', 'Yes'] }],
    'Implants': [{ q: 'How many teeth are you replacing?', o: ['One', 'Two or three', 'Four or more', 'Not sure'] }, { q: 'Have you had a dental scan or X-ray recently?', o: ['Yes', 'No'] }],
    'Whitening': [{ q: 'Are your teeth sensitive to hot or cold?', o: ['No', 'A little', 'Yes, quite a bit'] }, { q: 'Is there an event you are preparing for?', o: ['No date in mind', 'Within a month', 'Within three months'] }],
    'Not sure yet': [{ q: 'What is bothering you most?', o: ['Pain', 'Appearance', 'Bad breath', 'Just a check-up'] }, { q: 'How long has it been going on?', o: ['A few days', 'A few weeks', 'Months', 'A long time'] }],
};
const TREAT_SHORT: Record<string, string> = {
    'Teeth cleaning': 'Check-up and professional clean', 'Braces / aligners': 'Straighter teeth, first consultation', 'Root canal': 'Tooth pain or infection', 'Implants': 'Replace one or more missing teeth', 'Whitening': 'A brighter, healthier looking smile', 'Not sure yet': 'Talk it through with a dentist',
};
const TREAT_NOTE: Record<string, string> = {
    'Teeth cleaning': 'A routine visit. Your dentist will check your gums and teeth and explain what they find.',
    'Braces / aligners': 'A first consultation to talk through options. Cost and timeline are explained at the visit.',
    'Root canal': 'Your dentist will examine the tooth first, then explain the treatment and the cost.',
    'Implants': 'A consultation and assessment. Your dentist explains whether implants suit you and what they involve.',
    'Whitening': 'Your dentist checks your teeth and gums first, then explains the options and the cost.',
    'Not sure yet': 'That is completely fine. A dentist will listen, examine and tell you what they recommend.',
};

const mk = (o: Partial<Lead> & Pick<Lead, 'id' | 'name' | 'phone' | 'treatment' | 'clinic' | 'when' | 'status' | 'calledIn' | 'received' | 'summary'>): Lead => ({ transcript: [], answers: [], language: 'English', notes: [], ...o });
const seed: Lead[] = [
    mk({ id: 1, name: 'Ananya R.', phone: '+91 98xxx 12034', treatment: 'Braces / aligners', clinic: 'Indiranagar', when: 'This weekend', status: 'booked', calledIn: '1 min 12 s', calledSecs: 72, received: '10:42', slot: 'Sat, 11:30 AM',
        answers: [{ q: 'Worn braces before?', a: 'Never' }, { q: 'What matters most?', a: 'A discreet look' }],
        summary: 'Wants aligners before a family wedding in March. Has not seen an orthodontist before. Consultation booked at Indiranagar.',
        transcript: [{ who: 'AI', text: `Hi Ananya, it's Moli, HappySmile's virtual assistant. You asked about braces a minute ago. Is now an okay time?` }, { who: 'Patient', text: 'Yes, tell me about aligners.' }, { who: 'AI', text: `The dentist goes through options and cost at a consultation, so I can't quote a price. Saturday 11:30 at Indiranagar is free. Shall I hold it?` }, { who: 'Patient', text: 'Yes please.' }] }),
    mk({ id: 2, name: 'Rahul M.', phone: '+91 99xxx 55810', treatment: 'Root canal', clinic: 'Koramangala', when: 'As soon as possible', status: 'staff', calledIn: '1 min 48 s', calledSecs: 108, received: '10:51', urgent: true, reason: 'Severe pain, asked for a person', wait: '4 min',
        answers: [{ q: 'Pain right now?', a: 'Severe or constant' }, { q: 'Swelling or fever?', a: 'No' }],
        summary: 'Severe tooth pain for two days. Asked to speak to someone who can see him today. A 4:00 PM slot is held and needs staff to confirm.',
        transcript: [{ who: 'AI', text: `Hi Rahul, it's Moli, HappySmile's virtual assistant. I can book you in, or put you through to the team. Which would you like?` }, { who: 'Patient', text: 'It really hurts. Can I talk to a person?' }, { who: 'AI', text: `Of course. I'm putting you through to the Koramangala front desk now, and sending them a summary so you won't repeat yourself.` }] }),
    mk({ id: 3, name: 'Sneha K.', phone: '+91 97xxx 40921', treatment: 'Teeth cleaning', clinic: 'Andheri West', when: 'As soon as possible', status: 'booked', calledIn: '1 min 40 s', calledSecs: 100, received: '11:03', slot: 'Tomorrow, 6:00 PM', language: 'Hindi',
        answers: [{ q: 'Last check-up?', a: 'Over a year ago' }, { q: 'Sensitivity or bleeding?', a: 'No' }],
        summary: 'Routine cleaning, prefers calls in Hindi. Flexible on timing. Booked an evening slot at Andheri West.',
        transcript: [{ who: 'AI', text: 'Namaste Sneha, main Moli hoon, HappySmile ki virtual assistant. Aapne cleaning ke baare mein poocha tha.' }, { who: 'Patient', text: 'Haan, shaam ko aa sakti hoon.' }, { who: 'AI', text: 'Kal shaam 6 baje Andheri West mein slot khali hai. Maine book kar diya hai.' }] }),
    mk({ id: 4, name: 'Vikram S.', phone: '+91 98xxx 77102', treatment: 'Implants', clinic: 'Banjara Hills', when: 'As soon as possible', status: 'noanswer', calledIn: 'No pickup, 2 attempts', received: '11:09',
        answers: [{ q: 'Teeth to replace?', a: 'Two or three' }, { q: 'Recent scan?', a: 'No' }],
        summary: 'Two calls unanswered. A text with the clinic name and a link to pick a slot has been sent. Next retry in 30 minutes.',
        transcript: [{ who: 'AI', text: 'Call 1 at 11:10: no answer. Call 2 at 11:25: no answer. Text message sent.' }] }),
    mk({ id: 5, name: 'Meera P.', phone: '+91 96xxx 30277', treatment: 'Whitening', clinic: 'Indiranagar', when: 'As soon as possible', status: 'staff', calledIn: '1 min 05 s', calledSecs: 65, received: '11:14', reason: 'Asked about price and insurance', wait: '9 min',
        answers: [{ q: 'Sensitive teeth?', a: 'A little' }, { q: 'Preparing for an event?', a: 'Within a month' }],
        summary: 'Wanted an exact price and whether insurance covers whitening. That is outside what the assistant answers, so it handed her to staff with a note.',
        transcript: [{ who: 'AI', text: `Whitening starts with a consultation, and the dentist gives you the price there.` }, { who: 'Patient', text: 'I need the exact cost and insurance first.' }, { who: 'AI', text: `I can't give you a price or talk about insurance, but the team can. I'm passing you to them now.` }] }),
    mk({ id: 6, name: 'Karthik N.', phone: '+91 98xxx 66120', treatment: 'Teeth cleaning', clinic: 'Koramangala', when: 'Tomorrow, 5:00 PM', status: 'scheduled', calledIn: 'Not yet called', received: '11:20', scheduledFor: 'Tomorrow, 5:00 PM',
        answers: [{ q: 'Last check-up?', a: '6 to 12 months' }, { q: 'Sensitivity or bleeding?', a: 'Bleeding gums' }],
        summary: 'Was in a meeting when he enquired and asked for a call tomorrow at 5:00 PM. Moli will call at that time.' }),
    mk({ id: 7, name: 'Divya T.', phone: '+91 90xxx 81456', treatment: 'Braces / aligners', clinic: 'Andheri West', when: 'As soon as possible', status: 'booked', calledIn: '1 min 22 s', calledSecs: 82, received: '11:26', slot: 'Today, 5:30 PM',
        answers: [{ q: 'Worn braces before?', a: 'Yes, recently' }, { q: 'What matters most?', a: 'Shortest treatment' }],
        summary: 'Had braces recently and wants a second opinion on a relapse. Booked for this evening at Andheri West.' }),
    mk({ id: 8, name: 'Arjun D.', phone: '+91 91xxx 20988', treatment: 'Not sure yet', clinic: 'Banjara Hills', when: 'As soon as possible', status: 'noanswer', calledIn: 'No pickup, 1 attempt', received: '11:31',
        answers: [{ q: 'Bothering you most?', a: 'Bad breath' }, { q: 'For how long?', a: 'Months' }],
        summary: 'One call unanswered. Second attempt is queued. Text message sent.' }),
];

const LABEL: Record<Status, string> = { booked: 'Booked', staff: 'With staff', noanswer: 'Not reached', calling: 'Calling now', scheduled: 'Scheduled' };
const fmtSecs = (n: number) => `${Math.floor(n / 60)} min ${String(Math.round(n % 60)).padStart(2, '0')} s`;
const firstName = (n: string) => n.trim().split(/\s+/)[0] || '';

function Logo({ size = 44 }: { size?: number }) {
    return <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label="HappySmile logo">
        <defs><linearGradient id="lg1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#2a78c8" /><stop offset="1" stopColor="#0a2540" /></linearGradient></defs>
        <rect width="64" height="64" rx="18" fill="url(#lg1)" />
        <path d="M32 12c-3.500-2.500-8-2-10.500.5-3.500 3.500-3 9 .5 14 1.500 2.200 2 4 2.500 8 .5 4.500 1.500 8 3.500 8 2 0 2-5.500 3-8 .5-1.200 1.200-1.800 1-1.800s.5.600 1 1.800c1 2.500 1 8 3 8 2 0 3-3.500 3.500-8 .5-4 1-5.800 2.500-8 3.500-5 4-10.500.5-14C40 10 35.500 9.500 32 12z" fill="#fff" />
        <g className="hs-lg-face">
            <circle className="hs-lg-eye" cx="28" cy="21.500" r="1.700" fill="#0a2540" /><circle className="hs-lg-eye" cx="36" cy="21.500" r="1.700" fill="#0a2540" />
            <circle cx="24.800" cy="26" r="2" fill="#f2a9a9" opacity=".55" /><circle cx="39.200" cy="26" r="2" fill="#f2a9a9" opacity=".55" />
            <path className="hs-lg-smile" d="M27.500 26.200c1.200 3.600 7.800 3.600 9 0" fill="none" stroke="#0a2540" strokeWidth="1.900" strokeLinecap="round" />
        </g>
        <path className="hs-lg-star" d="M49 11l1.100 2.900L53 15l-2.900 1.100L49 19l-1.100-2.900L45 15l2.900-1.100z" fill="#e7c98f" />
        <path className="hs-lg-star two" d="M13.500 44l.7 1.800 1.800.7-1.800.7-.7 1.800-.7-1.800-1.800-.7 1.800-.7z" fill="#e7c98f" />
    </svg>;
}
function VoiceBox({ name }: { name: string }) {
    const [open, setOpen] = useState(false);
    const [loaded, setLoaded] = useState(false);
    return <div className="hs-voice">
        {!open ? <button type="button" className="hs-btn" onClick={() => setOpen(true)}>Or talk to Moli right now, in your browser</button> : <>
            <iframe title="Talk to Moli, live voice demo" src={'https://happysmile-voice-preview.netlify.app/?embed=1&n=' + encodeURIComponent(name)} allow="microphone" onLoad={() => setLoaded(true)} />
            {!loaded && <p className="hs-muted">Opening the voice demo...</p>}
        </>}
        <p className="hs-muted hs-voice-note">Live voice demo, sample data only. Needs a microphone and an internet connection. If it does not work on your device, nothing is lost: the call steps above continue as normal.</p>
    </div>;
}
function Mascot({ className = '', mood = 'idle' }: { className?: string; mood?: 'idle' | 'calling' | 'happy' }) {
    const body = 'M64 52c15-14 36-2 56-2s41-12 56 2c27 22 24 64 12 98-7 20-9 38-14 56-4 12-10 14-16 4-7-12-9-28-16-35-6-6-15-6-22 0-7 7-9 23-16 35-6 10-12 8-16-4-5-18-7-36-14-56-12-34-15-76 12-98z';
    return <svg className={'hs-mascot hs-m-' + mood + ' ' + className} viewBox="0 0 240 270" role="img" aria-label="Moli, the HappySmile virtual assistant">
        <defs>
            <radialGradient id="mBody" cx="0.36" cy="0.24" r="0.95"><stop offset="0" stopColor="#ffffff" /><stop offset="0.45" stopColor="#f3f7fd" /><stop offset="0.8" stopColor="#d9e5f4" /><stop offset="1" stopColor="#b9cde6" /></radialGradient>
            <linearGradient id="mShade" x1="0" y1="0" x2="1" y2="0.2"><stop offset="0" stopColor="#fff" stopOpacity="0" /><stop offset="0.7" stopColor="#7d9cc6" stopOpacity="0.1" /><stop offset="1" stopColor="#4b6f9e" stopOpacity="0.35" /></linearGradient>
            <linearGradient id="mHead" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#3b8be0" /><stop offset="0.55" stopColor="#1d5fa8" /><stop offset="1" stopColor="#0a2540" /></linearGradient>
            <radialGradient id="mEye" cx="0.4" cy="0.3" r="0.8"><stop offset="0" stopColor="#35557a" /><stop offset="0.5" stopColor="#0f2a47" /><stop offset="1" stopColor="#050f1d" /></radialGradient>
            <radialGradient id="mCheek" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stopColor="#ff9aa0" stopOpacity="0.75" /><stop offset="1" stopColor="#ff9aa0" stopOpacity="0" /></radialGradient>
            <radialGradient id="mShoe" cx="0.35" cy="0.25" r="0.9"><stop offset="0" stopColor="#4f9bea" /><stop offset="1" stopColor="#0d3566" /></radialGradient>
            <radialGradient id="mGold" cx="0.35" cy="0.3" r="0.8"><stop offset="0" stopColor="#fff1c9" /><stop offset="0.5" stopColor="#d9b36c" /><stop offset="1" stopColor="#8f6d33" /></radialGradient>
            <radialGradient id="mHand" cx="0.35" cy="0.3" r="0.9"><stop offset="0" stopColor="#ffffff" /><stop offset="1" stopColor="#c6d8ee" /></radialGradient>
            <filter id="mBlur" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="3" /></filter>
            <filter id="mSoft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="6" /></filter>
        </defs>
        <ellipse className="m-shadow" cx="120" cy="256" rx="62" ry="9" fill="#0a2540" opacity=".2" filter="url(#mSoft)" />
        <g className="m-float">
            {/* legs and shoes */}
            <g>
                <path d="M96 204c-1 14-2 24-2 30" stroke="#d3e0f1" strokeWidth="11" strokeLinecap="round" fill="none" />
                <path d="M144 204c1 14 2 24 2 30" stroke="#d3e0f1" strokeWidth="11" strokeLinecap="round" fill="none" />
                <ellipse cx="92" cy="244" rx="19" ry="10" fill="url(#mShoe)" /><ellipse cx="148" cy="244" rx="19" ry="10" fill="url(#mShoe)" />
                <ellipse cx="86" cy="240" rx="8" ry="3.500" fill="#fff" opacity=".35" /><ellipse cx="142" cy="240" rx="8" ry="3.500" fill="#fff" opacity=".35" />
            </g>
            {/* left arm */}
            <g className="m-armL">
                <path d="M62 138c-16 4-27 14-30 30" stroke="#d3e0f1" strokeWidth="15" strokeLinecap="round" fill="none" />
                <path d="M62 135c-16 4-27 14-30 30" stroke="#fff" strokeWidth="5" strokeLinecap="round" fill="none" opacity=".7" />
                <circle cx="31" cy="170" r="12" fill="url(#mHand)" />
            </g>
            {/* body */}
            <path d={body} fill="url(#mBody)" />
            <path d={body} fill="url(#mShade)" />
            <path d={body} fill="none" stroke="#fff" strokeWidth="2.500" opacity=".8" />
            <path d="M82 66c10-9 24-9 34-3" stroke="#fff" strokeWidth="9" strokeLinecap="round" fill="none" opacity=".9" filter="url(#mBlur)" />
            <ellipse cx="78" cy="92" rx="9" ry="20" transform="rotate(14 78 92)" fill="#fff" opacity=".55" filter="url(#mBlur)" />
            <path d="M168 150c4 20-2 40-8 58" stroke="#6c8cb8" strokeWidth="10" strokeLinecap="round" fill="none" opacity=".18" filter="url(#mBlur)" />
            {/* face */}
            <g className="m-eyes">
                <g className="m-blink" style={{ transformOrigin: '98px 112px' }}>
                    <ellipse cx="98" cy="112" rx="11" ry="14.500" fill="url(#mEye)" /><ellipse cx="102" cy="106" rx="4.200" ry="5" fill="#fff" /><circle cx="94" cy="118" r="2" fill="#fff" opacity=".8" />
                </g>
                <g className="m-blink" style={{ transformOrigin: '142px 112px' }}>
                    <ellipse cx="142" cy="112" rx="11" ry="14.500" fill="url(#mEye)" /><ellipse cx="146" cy="106" rx="4.200" ry="5" fill="#fff" /><circle cx="138" cy="118" r="2" fill="#fff" opacity=".8" />
                </g>
            </g>
            <path className="m-brow" d="M86 90c6-5 14-5 20-1M134 89c6-4 14-4 20 1" stroke="#9db6d6" strokeWidth="3" strokeLinecap="round" fill="none" opacity=".0" />
            <ellipse cx="80" cy="134" rx="13" ry="8" fill="url(#mCheek)" /><ellipse cx="160" cy="134" rx="13" ry="8" fill="url(#mCheek)" />
            <path className="m-smile" d="M104 136c8 9 24 9 32 0" fill="none" stroke="#0f2a47" strokeWidth="4" strokeLinecap="round" />
            <g className="m-open"><path d="M102 134c9 20 27 20 36 0z" fill="#0f2a47" stroke="#0f2a47" strokeWidth="3" strokeLinejoin="round" /><path d="M110 146c6 5 14 5 20 0c-4-5-16-5-20 0z" fill="#ff8f98" /><path d="M108 135h24" stroke="#fff" strokeWidth="5" strokeLinecap="round" /></g>
            {/* headset */}
            <g className="m-head" style={{ transformOrigin: '120px 120px' }}>
                <path d="M58 112c-6-46 24-70 62-70s68 24 62 70" fill="none" stroke="url(#mHead)" strokeWidth="9" strokeLinecap="round" />
                <path d="M62 90c4-30 26-44 58-44" fill="none" stroke="#fff" strokeWidth="2.500" strokeLinecap="round" opacity=".45" />
                <rect x="46" y="100" width="20" height="40" rx="10" fill="url(#mHead)" /><rect x="174" y="100" width="20" height="40" rx="10" fill="url(#mHead)" />
                <rect x="51" y="105" width="5" height="22" rx="2.500" fill="#fff" opacity=".35" /><rect x="179" y="105" width="5" height="22" rx="2.500" fill="#fff" opacity=".25" />
                <circle className="m-ring r1" cx="56" cy="120" r="14" fill="none" stroke="#3b8be0" strokeWidth="2" opacity="0" /><circle className="m-ring r2" cx="184" cy="120" r="14" fill="none" stroke="#3b8be0" strokeWidth="2" opacity="0" />
                <path d="M52 136c2 24 28 36 50 32" fill="none" stroke="url(#mHead)" strokeWidth="5" strokeLinecap="round" />
                <circle className="m-mic" cx="104" cy="168" r="7" fill="url(#mGold)" /><ellipse cx="102" cy="165" rx="2.600" ry="1.800" fill="#fff" opacity=".8" />
            </g>
            {/* right arm: waving */}
            <g className="m-arm" style={{ transformOrigin: '178px 150px' }}>
                <path d="M178 150c18-6 28-22 26-42" stroke="#d3e0f1" strokeWidth="15" strokeLinecap="round" fill="none" />
                <path d="M180 147c16-6 25-20 24-38" stroke="#fff" strokeWidth="5" strokeLinecap="round" fill="none" opacity=".7" />
                <circle cx="204" cy="100" r="13" fill="url(#mHand)" /><ellipse cx="200" cy="96" rx="4" ry="3" fill="#fff" opacity=".8" />
            </g>
        </g>
        <g className="m-tw t1"><path d="M205 38l3 8 8 3-8 3-3 8-3-8-8-3 8-3z" fill="url(#mGold)" /></g>
        <g className="m-tw t2"><path d="M34 70l2 5.500 5.500 2-5.500 2-2 5.500-2-5.500-5.500-2 5.500-2z" fill="url(#mGold)" /></g>
        <g className="m-tw t3"><path d="M214 190l1.800 4.600 4.600 1.800-4.600 1.800-1.800 4.600-1.800-4.600-4.600-1.800 4.600-1.800z" fill="#9cc2f0" /></g>
    </svg>;
}

function Brand() {
    return <div className="hs-brand"><Logo size={42} /><span><b>HappySmile</b><i>Dental Care</i></span></div>;
}

/* ---------------- Screen 1: patient journey ---------------- */
const SLOTS: { label: string; h: number; m: number }[] = [
    { label: '10:00 AM', h: 10, m: 0 }, { label: '11:30 AM', h: 11, m: 30 }, { label: '2:00 PM', h: 14, m: 0 },
    { label: '3:30 PM', h: 15, m: 30 }, { label: '5:00 PM', h: 17, m: 0 }, { label: '6:30 PM', h: 18, m: 30 },
];
const pad = (n: number) => String(n).padStart(2, '0');
const isoDay = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const niceDay = (d: Date) => d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

function Stepper({ step }: { step: number }) {
    const items = ['About you', 'Your visit', 'Clinic and time'];
    return <ol className="hs-stepper" aria-label="Progress">{items.map((t, i) => <li key={t} className={step === i + 1 ? 'now' : step > i + 1 ? 'done' : ''}><span>{step > i + 1 ? '\u2713' : i + 1}</span><em>{t}</em></li>)}</ol>;
}

function Choice({ options, value, onChange, cols }: { options: string[]; value: string; onChange: (v: string) => void; cols?: boolean }) {
    return <div className={'hs-choice' + (cols ? ' cols' : '')} role="radiogroup">{options.map((o) => <button type="button" role="radio" aria-checked={value === o} key={o} className={value === o ? 'on' : ''} onClick={() => onChange(o)}>{o}</button>)}</div>;
}

function Enquiry({ onNewLead, onGoStaff, leads, update }: { onNewLead: (l: Lead) => number; onGoStaff: () => void; leads: Lead[]; update: (id: number, patch: Partial<Lead>) => void }) {
    const [dup, setDup] = useState<Lead | null>(null);
    const [busy, setBusy] = useState(false);
    const [resched, setResched] = useState<number | null>(null);
    const [dupMsg, setDupMsg] = useState<'kept' | 'person' | 'changed'>('kept');
    const [step, setStep] = useState(1);
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [lang, setLang] = useState('English');
    const [treatment, setTreatment] = useState('');
    const [ans, setAns] = useState<string[]>(['', '']);
    const [clinic, setClinic] = useState('');
    const [nervous, setNervous] = useState(false);
    const [err, setErr] = useState('');
    const [stage, setStage] = useState(0); // 0 wizard, 1..4 instant, 5 scheduled
    const [secs, setSecs] = useState(120);
    const [human, setHuman] = useState(false);
    const [leadId, setLeadId] = useState<number | null>(null);
    const [sched, setSched] = useState(false);
    const [dayKey, setDayKey] = useState<'today' | 'tomorrow' | 'custom'>('tomorrow');
    const [custom, setCustom] = useState('');
    const [slot, setSlot] = useState('');
    const [schedText, setSchedText] = useState('');
    const timers = useRef<number[]>([]);
    useEffect(() => () => timers.current.forEach(clearTimeout), []);
    const fn = firstName(name);
    const qs = treatment ? QUESTIONS[treatment] : [];
    const urgent = treatment === 'Root canal' && (ans[0] === 'Severe or constant' || ans[1] === 'Yes');

    const now = new Date();
    const chosenDate: Date | null = dayKey === 'today' ? new Date(now.getFullYear(), now.getMonth(), now.getDate()) : dayKey === 'tomorrow' ? new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1) : custom ? (() => { const [y, m, d] = custom.split('-').map(Number); return new Date(y, m - 1, d); })() : null;
    const isToday = !!chosenDate && isoDay(chosenDate) === isoDay(now);
    const slotOk = (s: { h: number; m: number }) => !isToday || s.h * 60 + s.m > now.getHours() * 60 + now.getMinutes() + 30;
    const availableSlots = SLOTS.filter(slotOk);
    const instantSlot = 'Tomorrow, 11:00 AM';

    function next() {
        if (step === 1) {
            const digits = phone.replace(/\D/g, '');
            if (name.trim().length < 2) return setErr('Could you add your name? We would like to greet you properly.');
            if (digits.length < 10) return setErr('That number looks a little short. A 10 digit mobile number works best, and nothing you typed is lost.');
        }
        if (step === 2) {
            if (!treatment) return setErr('Choose the closest match. "Not sure yet" is a fine answer.');
            if (qs.some((_, i) => !ans[i])) return setErr('Two quick taps and we are done here. They help the dentist prepare.');
        }
        setErr(''); setStep(step + 1);
    }
    const answersList = (): QA[] => qs.map((q, i) => ({ q: q.q, a: ans[i] }));
    const base = () => {
        const tail = phone.replace(/\D/g, '').slice(-10);
        return { phone: `+91 ${tail.slice(0, 2)}xxx ${tail.slice(-5)}`, name: name.trim(), treatment, clinic, answers: answersList(), language: lang, urgent, nervous, notes: [] as string[], received: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }) };
    };
    const hhmm = () => new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
    function findDup(): Lead | null {
        const m = base().phone;
        return leads.find((l) => l.phone === m && l.treatment === treatment && l.status !== 'noanswer') ?? null;
    }
    function repeatAttempt(): boolean {
        if (resched !== null) return false;
        const d = findDup();
        if (!d) return false;
        setDup(d); setStage(6); setErr('');
        update(d.id, { notes: [...d.notes, `${hhmm()}  Patient tried to book this appointment again. No new enquiry was created.`] });
        return true;
    }
    function keepSlot() { setDupMsg('kept'); setStage(7); }
    function talkToPerson() {
        if (!dup) return;
        update(dup.id, { status: 'staff', reason: 'Patient asked to talk to a person about an existing appointment', wait: '1 min', live: true, notes: [...dup.notes, `${hhmm()}  Patient asked to talk to a person about their existing appointment.`] });
        setDupMsg('person'); setStage(7);
    }
    function changeSlot() { if (!dup) return; setResched(dup.id); setSched(true); setStep(3); setStage(0); setSlot(''); setErr(''); }
    function submitNow() {
        if (!clinic) return setErr('Pick the clinic that is easiest for you to reach.');
        if (repeatAttempt()) return;
        setErr('');
        const id = onNewLead({ id: Date.now(), ...base(), when: 'As soon as possible', status: 'calling', calledIn: 'In progress', summary: 'Call in progress.', transcript: [], live: true });
        setLeadId(id); setStage(1); setSecs(120); setHuman(urgent);
        const t = (ms: number, f: () => void) => timers.current.push(window.setTimeout(f, ms));
        t(1800, () => setStage(2)); t(4200, () => setStage(3)); t(6800, () => setStage(4));
    }
    function submitScheduled() {
        if (!clinic) return setErr('Pick the clinic that is easiest for you to reach.');
        if (!chosenDate) return setErr('Choose a date for your call.');
        if (!slot) return setErr('Choose a time for your call.');
        setErr('');
        const text = `${niceDay(chosenDate)}, ${slot}`;
        if (resched !== null) {
            const d = leads.find((l) => l.id === resched);
            const old = d?.slot ?? d?.scheduledFor ?? instantSlot;
            update(resched, { slot: text, scheduledFor: text, when: text, rescheduled: true, summary: `${d?.summary ?? ''} Slot changed by the patient from ${old} to ${text}.`, notes: [...(d?.notes ?? []), `${hhmm()}  Patient changed their slot from ${old} to ${text}.`] });
            setSchedText(text); setDupMsg('changed'); setStage(7); return;
        }
        if (repeatAttempt()) return;
        const b = base();
        onNewLead({ id: Date.now(), ...b, when: text, status: 'scheduled', calledIn: 'Not yet called', scheduledFor: text, live: true,
            summary: `${b.name} asked for a call-back on ${text} about ${treatment.toLowerCase()} at ${clinic}${urgent ? ', and reported severe pain, so staff may want to call sooner' : ''}. Preferred language: ${lang}.${nervous ? ' Feels nervous about dental visits, so a gentle approach is appreciated.' : ''} Moli will call at that time.`, transcript: [] });
        setSchedText(text); setStage(5);
    }
    useEffect(() => {
        if (stage === 0 || stage >= 4) return;
        const i = window.setInterval(() => setSecs((s) => Math.max(0, s - 22)), 1000);
        return () => clearInterval(i);
    }, [stage]);
    useEffect(() => {
        if (stage === 4 && leadId !== null) onNewLead({ id: leadId, __update: true, human, busy: human && busy, slot: instantSlot } as unknown as Lead);
    }, [stage, busy]);
    function reset() { timers.current.forEach(clearTimeout); setStage(0); setStep(1); setHuman(false); setName(''); setPhone(''); setTreatment(''); setAns(['', '']); setClinic(''); setNervous(false); setLeadId(null); setDup(null); setBusy(false); setResched(null); setSched(false); setSlot(''); setCustom(''); setErr(''); }

    const steps = ['Enquiry received', 'Moli is calling you', 'Appointment offered at ' + clinic, human ? (busy ? 'Slot held, team will call you' : 'Connected to our front desk') : 'Appointment confirmed'];
    const mood: 'idle' | 'calling' | 'happy' = stage === 0 ? 'idle' : stage >= 1 && stage < 4 ? 'calling' : 'happy';
    const today = isoDay(now);
    const bubble = stage === 0
        ? step === 1 ? `Hi, I'm Moli, HappySmile's virtual assistant. Fill this in and I'll call you within two minutes to sort out a time. Prefer a person? Just say "human" on the call.`
        : step === 2 ? (nervous ? `Thanks for telling me, ${fn}. Plenty of people feel that way. I'll pass it on so the team takes it slowly with you.` : `Nice to meet you, ${fn}. These two questions go to your dentist, so nobody has to ask you twice.`)
        : urgent ? `${fn}, that sounds painful. When I call, I'll bring in a team member straight away.` : `Last bit, ${fn}. Pick the clinic nearest you, then a call right now or a time that works.`
        : stage < 4 ? `Calling you now, ${fn}. Pick up when it rings. I'll check what you told us, then offer a time.`
        : stage === 6 ? `${fn}, you already have an appointment for this, so I haven't booked a second one. Keep it, or change the time?`
        : stage === 5 ? `Done, ${fn}. I'll ring you at the time you picked, and we'll book your appointment on that call.` : human ? (busy ? `${fn}, nobody on the team is free this second. I'm holding your slot. Someone will ring you in about 10 minutes and they'll already have your summary.` : `Sure, ${fn}. I'm putting you through to the ${clinic} team now. I've sent them your summary, so you won't have to repeat it.`) : `You're booked, ${fn}. Your time is above, and a reminder will come before your visit.`;

    return <section className="hs-enq">
        <div className="hs-hero">
            <p className="hs-eyebrow">{stage === 0 && step > 1 ? `Hello, ${fn}` : 'Book an appointment'}</p>
            <h1>{stage === 0 && step > 1 ? 'A few details, so your dentist is ready for you.' : 'Your appointment, arranged in one short call.'}</h1>
            <p className="hs-lead">{stage === 0 ? 'Tell us who you are and what you need. Moli, our virtual assistant, rings you within two minutes, or whenever suits you, and finds a time at your clinic. Nervous about the dentist? Say so, and the team will take it gently.' : (stage === 6 || stage === 7 ? 'We found your existing appointment, so we did not book a second one.' : 'Your request is with our team. You can watch each stage on the right.')}</p>
            <div className="hs-hero-art"><Mascot mood={mood} /><div className="hs-bubble"><b>Moli, virtual assistant</b>{bubble}</div></div>
            <ul className="hs-expect" aria-label="What to expect"><li><b>Tell us a little</b><span>Name, phone, treatment and clinic. About a minute.</span></li><li><b>Moli calls you</b><span>She confirms the details and offers the next free time.</span></li><li><b>See your dentist</b><span>Options and cost are explained before anything starts.</span></li></ul>
            <details className="hs-how2"><summary>How the call works <em>Design intent</em></summary>
                <p className="hs-fine left">This describes how the service is designed to work. The call in this prototype is simulated.</p>
                <dl>
                    <dt>What Moli says</dt><dd>She tells you her name and that she is a virtual assistant. Then she repeats back what you told us, so you are not asked twice, and offers the next free times at your clinic.</dd>
                    <dt>When a person takes over</dt><dd>Say "human", mention severe pain or swelling, or ask about cost or insurance, and she puts you through to the clinic team on the same call, with your summary. If nobody is free she holds your slot and the team rings you within about 10 minutes. You show up at the top of their queue.</dd>
                    <dt>Booked without staff</dt><dd>If you say yes to a time she offers, it is booked on that call. This needs access to each clinic's live calendar, which is still to be confirmed.</dd>
                </dl>
            </details>
        </div>
        <div className="hs-card hs-form-card">
            {stage === 0 ? <form onSubmit={(e) => { e.preventDefault(); if (step < 3) next(); }} noValidate>
                <Stepper step={step} />
                {step === 1 && <>
                    <h2>Let us start with you</h2>
                    <p className="hs-sub">We only use these details to arrange your appointment.</p>
                    <label>Your name<input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" autoComplete="off" /></label>
                    <label>Mobile number<div className="hs-phone"><span>+91</span><input inputMode="numeric" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="98765 43210" autoComplete="off" /></div></label>
                    <fieldset><legend>Which language would you like the call in?</legend><Choice options={LANGS} value={lang} onChange={setLang} /></fieldset>
                </>}
                {step === 2 && <>
                    <h2>{fn}, what brings you in?</h2>
                    <p className="hs-sub">Choose the closest match. The dentist will confirm everything at your visit.</p>
                    <div className="hs-tiles">{TREATMENTS.map((t) => <button type="button" key={t} className={'hs-tile' + (treatment === t ? ' on' : '')} aria-pressed={treatment === t} onClick={() => { setTreatment(t); setAns(['', '']); }}><b>{t}</b><span>{TREAT_SHORT[t]}</span></button>)}</div>
                    {treatment && <div className="hs-note">{TREAT_NOTE[treatment]}</div>}
                    {treatment && qs.map((q, i) => <fieldset key={q.q}><legend>{q.q}</legend><Choice options={q.o} value={ans[i]} onChange={(v) => setAns(ans.map((x, j) => (j === i ? v : x)))} /></fieldset>)}
                    {treatment && <button type="button" className={'hs-care' + (nervous ? ' on' : '')} role="checkbox" aria-checked={nervous} onClick={() => setNervous(!nervous)}><span aria-hidden="true">{nervous ? '\u2713' : ''}</span><i><b>Optional:</b> I feel nervous about dental visits. Please let the team know.</i></button>}
                </>}
                {step === 3 && <>
                    <h2>{resched !== null ? `Change your slot, ${fn}` : `Where and when, ${fn}?`}</h2>
                    {urgent && <div className="hs-alert"><b>We have marked your request as urgent.</b> Because you mentioned severe pain or swelling, a team member will join the call straight away. If it gets worse, please go to your nearest emergency department.</div>}
                    {resched !== null ? <p className="hs-sub">Pick a new day and time. Your appointment stays at HappySmile {clinic} for {treatment.toLowerCase()}.</p> : <p className="hs-sub">Choose your clinic, then a call now or at a time that suits you.</p>}
                    {resched === null && <><div className="hs-tiles">{CLINICS.map((c) => <button type="button" key={c} className={'hs-tile' + (clinic === c ? ' on' : '')} aria-pressed={clinic === c} onClick={() => setClinic(c)}><b>{c}</b><span>HappySmile Dental Care</span></button>)}</div>
                    <button type="button" className="hs-btn" onClick={submitNow}><svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M6.600 10.800a15 15 0 006.600 6.600l2.200-2.200a1 1 0 011-.25 11.400 11.400 0 003.600.57 1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.500a1 1 0 011 1c0 1.250.2 2.450.57 3.600a1 1 0 01-.25 1z" fill="currentColor" /></svg>Call me within 2 minutes</button>
                    <div className="hs-or"><span>or choose a time</span></div></>}
                    {resched === null && <button type="button" className={'hs-btn outline' + (sched ? ' open' : '')} aria-expanded={sched} onClick={() => setSched(!sched)}><svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 2v3M17 2v3M3.500 9h17M5 4.500h14a1.500 1.500 0 011.500 1.500v13A1.500 1.500 0 0119 20.500H5A1.500 1.500 0 013.500 19V6A1.500 1.500 0 015 4.500z" fill="none" stroke="currentColor" strokeWidth="1.800" strokeLinecap="round" /></svg>Schedule a call for later</button>}
                    {(sched || resched !== null) && <div className="hs-sched">
                        <fieldset><legend>{resched !== null ? 'Which new day?' : 'Which day?'}</legend>
                            <div className="hs-chips">{(['today', 'tomorrow', 'custom'] as const).map((k) => <button type="button" key={k} className={'hs-chip' + (dayKey === k ? ' on' : '')} aria-pressed={dayKey === k} onClick={() => { setDayKey(k); setSlot(''); }}>{k === 'today' ? 'Today' : k === 'tomorrow' ? 'Tomorrow' : 'Pick a date'}</button>)}</div>
                            {dayKey === 'custom' && <input type="date" className="hs-date" min={today} value={custom} onChange={(e) => { setCustom(e.target.value); setSlot(''); }} aria-label="Choose a date" />}
                        </fieldset>
                        <fieldset><legend>{resched !== null ? 'Which new time?' : 'What time?'}</legend>
                            {chosenDate ? (availableSlots.length ? <div className="hs-chips">{SLOTS.map((s) => <button type="button" key={s.label} disabled={!slotOk(s)} className={'hs-chip' + (slot === s.label ? ' on' : '')} aria-pressed={slot === s.label} onClick={() => setSlot(s.label)}>{s.label}</button>)}</div> : <p className="hs-fine">No more slots today. Please choose tomorrow or another date.</p>) : <p className="hs-fine">Choose a date to see available times.</p>}
                        </fieldset>
                        <button type="button" className="hs-btn" onClick={submitScheduled}>{resched !== null ? 'Confirm new slot' : 'Confirm my scheduled call'}</button>{resched !== null && <button type="button" className="hs-link" onClick={keepSlot}>Keep my current slot</button>}
                    </div>}
                </>}
                {err && <p className="hs-err" role="alert">{err}</p>}
                {step === 1 && <p className="hs-fine">Takes about a minute. You can go back and change anything.</p>}
                {step < 3 && <div className="hs-nav">{step > 1 ? <button type="button" className="hs-btn ghost" onClick={() => { setErr(''); setStep(step - 1); }}>Back</button> : <span />}<button type="button" className="hs-btn" onClick={next}>Continue</button></div>}
                {step === 3 && resched === null && <div className="hs-nav one"><button type="button" className="hs-link" onClick={() => { setErr(''); setStep(2); }}>Back to your visit</button></div>}
                <div className="hs-trust"><div><b>No obligation</b>A visit does not commit you to treatment.</div><div><b>Private</b>Used only to arrange your appointment.</div><div><b>Human on request</b>Say "human" at any point.</div></div>
            </form> : stage === 6 && dup ? <div className="hs-confirm hs-dup" aria-live="polite">
                <div className="hs-mascot-sm"><Mascot mood="idle" /></div>
                <h2>You already have an appointment booked</h2>
                <p className="hs-muted">{fn}, this number already has an appointment for this treatment, so I have not booked another.</p>
                <dl className="hs-dupfacts"><div><dt>Date and time</dt><dd>{dup.slot ?? dup.scheduledFor ?? instantSlot}</dd></div><div><dt>Clinic</dt><dd>HappySmile {dup.clinic}</dd></div><div><dt>Treatment</dt><dd>{dup.treatment}</dd></div></dl>
                <div className="hs-ask"><b>Do you want to change the slot?</b>
                    <div className="hs-actions"><button type="button" className="hs-btn" onClick={changeSlot}>Yes, change it</button><button type="button" className="hs-btn ghost" onClick={keepSlot}>No, keep it</button></div></div>
                <button type="button" className="hs-link" onClick={talkToPerson}>I would rather talk to a person</button>
            </div> : stage === 7 ? <div className="hs-confirm" aria-live="polite">
                <div className="hs-mascot-sm"><Mascot mood="happy" /></div>
                <h2>{dupMsg === 'kept' ? 'Your appointment stays as it is' : dupMsg === 'changed' ? 'Your slot is updated' : 'A team member will call you'}</h2>
                {dup && <p className="hs-slot">{dupMsg === 'changed' ? schedText : (dup.slot ?? dup.scheduledFor ?? instantSlot)} <i>HappySmile {dup.clinic} · {dup.treatment}</i></p>}
                <p className="hs-muted">{dupMsg === 'kept' ? 'Nothing has changed and no second booking was made. A reminder will come before your visit.' : dupMsg === 'changed' ? 'Your old time is freed and the clinic has been told. You will get a new reminder.' : 'They can see your existing appointment, so you will not need to explain it.'}</p>
                <div className="hs-actions"><button type="button" className="hs-btn" onClick={onGoStaff}>See what HappySmile sees</button><button type="button" className="hs-btn ghost" onClick={reset}>New enquiry</button></div>
            </div> : stage === 5 ? <div className="hs-confirm" aria-live="polite">
                <div className="hs-mascot-sm"><Mascot mood="happy" /></div>
                <h2>Your call is scheduled, {fn}</h2>
                <p className="hs-slot">{schedText} <i>HappySmile {clinic} · {treatment}</i></p>
                <p className="hs-muted">Moli will ring you in {lang} from the HappySmile number. If you would rather talk to a person, say "human" on the call.</p>
                <ol className="hs-steps"><li className="done"><span />Call scheduled</li><li className="now"><span />Moli calls you at {schedText.split(', ').pop()}</li><li><span />Appointment confirmed on the call</li></ol>
                <div className="hs-actions"><button type="button" className="hs-btn" onClick={onGoStaff}>See what HappySmile sees</button><button type="button" className="hs-btn ghost" onClick={reset}>New enquiry</button></div>
            </div> : <div className="hs-confirm" aria-live="polite">
                <div className="hs-mascot-sm"><Mascot mood={mood} /></div>
                {stage < 4 ? <>
                    <h2>Thank you, {fn}. Moli is calling you now.</h2>
                    <p className="hs-muted">Pick up when it rings. It will come from <b>+91 80 4000 0000</b> and Moli will speak {lang}. This number is a sample.</p>
                    <div className="hs-count"><b>{Math.floor(secs / 60)}:{String(secs % 60).padStart(2, '0')}</b><span>expected within, sped up for this preview</span></div>
                </> : <>
                    <h2>{human ? (busy ? `${fn}, we are holding your slot` : `${fn}, our front desk is on the line`) : `You are booked in, ${fn}`}</h2>
                    {!human && <p className="hs-slot">{instantSlot} <i>HappySmile {clinic} · {treatment}</i></p>}
                    {human && !busy && <p className="hs-muted">{urgent ? 'We have marked this as urgent. ' : ''}Moli has put you through to the {clinic} team and sent them your summary, so you will not need to explain again.</p>}
                    {human && busy && <><p className="hs-slot">{instantSlot} <i>Held for you at HappySmile {clinic}</i></p><p className="hs-muted">The team is with other patients at the moment. {urgent ? 'Because of the pain you mentioned, you are first on their list. ' : ''}Someone will ring you in about 10 minutes and will already have your summary.</p></>}
                    {human && <div className="hs-preview" role="group" aria-label="Prototype preview control"><span>Prototype preview: front desk is</span><button type="button" className={!busy ? 'on' : ''} aria-pressed={!busy} onClick={() => setBusy(false)}>Free</button><button type="button" className={busy ? 'on' : ''} aria-pressed={busy} onClick={() => setBusy(true)}>Busy</button></div>}
                    {!human && <div className="hs-bring"><b>Before your visit</b><ul><li>Bring any earlier dental records or X-rays if you have them.</li><li>Tell the team about any medicines you take or allergies you have.</li><li>You will get a reminder before your appointment.</li></ul></div>}
                </>}
                <ol className="hs-steps">{steps.map((s, i) => <li key={s} className={stage > i + 1 || (stage === 4 && i === 3) ? 'done' : stage === i + 1 ? 'now' : ''}><span />{s}</li>)}</ol>
                <VoiceBox name={fn} />
                <div className="hs-disc"><b>Moli is a virtual assistant, not a person.</b> If you would rather talk to someone, say "human" or tap the button. The team picks up with your details already on screen.</div>
                <div className="hs-actions">
                    {stage < 4 && <button type="button" className="hs-btn ghost" onClick={() => setHuman(true)}>{human ? 'A person will take over' : 'Talk to a person instead'}</button>}
                    {stage === 4 && <button type="button" className="hs-btn" onClick={onGoStaff}>See what HappySmile sees</button>}
                    {stage === 4 && <button type="button" className="hs-btn ghost" onClick={reset}>New enquiry</button>}
                </div>
            </div>}
        </div>
    </section>;
}

/* ---------------- Screen 2: clinic operations ---------------- */
function nextAction(l: Lead): { tone: string; title: string; text: string } {
    if (l.resolved) return { tone: 'ok', title: 'All done', text: 'Staff took over and this enquiry is resolved. Nothing else is needed.' };
    if (l.status === 'staff' && l.busy) return { tone: 'hot', title: 'Please call this patient now', text: `Moli could not reach anyone to take the call. She is holding the slot and told the patient someone will ring within about 10 minutes. The summary below saves you asking again.` };
    if (l.status === 'staff') return { tone: l.urgent ? 'hot' : 'warn', title: l.urgent ? 'Please call this patient now' : 'Please call this patient next', text: `${l.reason ?? 'Handed over by Moli'}. The summary below means you do not need to ask again.` };
    if (l.status === 'noanswer') return { tone: 'warn', title: 'No action needed yet', text: 'Moli has texted and will retry. Step in only if you would like to.' };
    if (l.status === 'scheduled') return { tone: 'calm', title: 'Nothing to do for now', text: `Moli will call at ${l.scheduledFor}. You can call earlier if you prefer.` };
    if (l.status === 'booked') return { tone: 'ok', title: 'Booked, nothing to do', text: `Appointment ${l.slot}. The patient will get a reminder.` };
    return { tone: 'calm', title: 'Moli is on the call', text: 'You will see a summary here as soon as it ends.' };
}

function Dashboard({ leads, update, focusId }: { leads: Lead[]; update: (id: number, patch: Partial<Lead>) => void; focusId: number | null }) {
    const [view, setView] = useState<'queue' | 'schedule' | 'insights'>('queue');
    const [filter, setFilter] = useState<'all' | Status>('all');
    const [clinic, setClinic] = useState('All clinics');
    const [q, setQ] = useState('');
    const [openId, setOpenId] = useState<number | null>(focusId ?? 2);
    const [note, setNote] = useState('');
    const [mob, setMob] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width:600px)').matches);
    useEffect(() => { const m = window.matchMedia('(max-width:600px)'); const f = () => setMob(m.matches); m.addEventListener('change', f); return () => m.removeEventListener('change', f); }, []);
    const inClinic = (l: Lead) => clinic === 'All clinics' || l.clinic === clinic;
    const pool = leads.filter(inClinic);
    const rated = pool.filter((l) => l.status !== 'scheduled' && l.status !== 'calling');
    const answered = rated.filter((l) => l.status !== 'noanswer');
    const booked = rated.filter((l) => l.status === 'booked');
    const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);
    const timed = rated.filter((l) => l.calledSecs);
    const avg = timed.length ? timed.reduce((a, l) => a + (l.calledSecs ?? 0), 0) / timed.length : 0;
    const waiting = pool.filter((l) => l.status === 'staff' && !l.resolved);
    const bookingRate = pct(booked.length, rated.length);
    const rank = (l: Lead) => (l.busy && l.status === 'staff' && !l.resolved ? -1 : l.urgent && l.status === 'staff' && !l.resolved ? 0 : l.status === 'staff' && !l.resolved ? 1 : l.live ? 2 : 3);
    const shown = pool.filter((l) => (filter === 'all' || l.status === filter) && (!q || (l.name + l.treatment + l.clinic).toLowerCase().includes(q.toLowerCase()))).sort((a, b) => rank(a) - rank(b));
    const [more, setMore] = useState(false);
    const LIMIT = 5;
    const cut = mob && !more && shown.length > LIMIT + 1;
    const listed = cut ? shown.slice(0, LIMIT) : shown;
    const open = leads.find((l) => l.id === openId) ?? null;
    const counts = (s: 'all' | Status) => (s === 'all' ? pool.length : pool.filter((l) => l.status === s).length);
    useEffect(() => { if (focusId) { setOpenId(focusId); setView('queue'); } }, [focusId]);
    const pick = (id: number) => { setOpenId(id); setView('queue'); setNote(''); };
    const hour = new Date().getHours();
    const hello = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    const na = open ? nextAction(open) : null;

    return <section className="hs-dash">
        <div className="hs-dash-hero">
            <div className="hs-dash-top">
                <div><p className="hs-eyebrow light">Clinic operations</p><h1>{hello}, front desk team</h1><p className="hs-dash-sub">{waiting.length ? `${waiting.length} ${waiting.length === 1 ? 'patient is' : 'patients are'} waiting for a person. Everyone else is being looked after by Moli.` : 'Everyone is being looked after. Nothing needs you right now.'}</p></div>
                <select aria-label="Clinic" value={clinic} onChange={(e) => setClinic(e.target.value)}><option>All clinics</option>{CLINICS.map((c) => <option key={c}>{c}</option>)}</select>
            </div>
            <div className="hs-kpis">
                <div className="hs-kpi hot"><span>Waiting for staff</span><b>{waiting.length}</b><i>each arrives with a summary</i></div>
                <div className="hs-kpi"><span>Answer rate</span><b>{pct(answered.length, rated.length)}%</b><i>of calls were picked up</i></div>
                <div className="hs-kpi"><span>Booking rate</span><b>{bookingRate}%</b><i className={bookingRate >= 30 ? 'up' : 'down'}>{bookingRate >= 30 ? '+' : ''}{bookingRate - 30} pts vs 30% baseline</i></div>
                <div className="hs-kpi"><span>Average time to first call</span><b>{avg ? fmtSecs(avg) : 'None yet'}</b><i>{pool.filter((l) => l.status === 'scheduled').length} more calls scheduled</i></div>
            </div>
        </div>
        <div className="hs-views" role="tablist" aria-label="Dashboard views">
            {([['queue', 'Enquiry queue', 'Queue'], ['schedule', 'Today and tomorrow', 'Schedule'], ['insights', 'Insights', 'Insights']] as const).map(([k, t, sh]) => <button key={k} role="tab" aria-selected={view === k} aria-label={t} className={view === k ? 'on' : ''} onClick={() => setView(k)}><span className="full">{t}</span><span className="short">{sh}</span></button>)}
        </div>

        {view === 'queue' && <>
            <div className="hs-toolbar">
                <div className="hs-tabs" role="tablist">{(['all', 'staff', 'scheduled', 'booked', 'noanswer'] as const).map((s) => <button key={s} role="tab" aria-selected={filter === s} className={filter === s ? 'on' : ''} onClick={() => { setFilter(s); setMore(false); }}>{s === 'all' ? 'All' : s === 'staff' ? 'Needs a person' : LABEL[s]} <em>{counts(s)}</em></button>)}</div>
                <input className="hs-search" type="search" placeholder="Search name or treatment" aria-label="Search enquiries" value={q} onChange={(e) => { setQ(e.target.value); setMore(false); }} />
            </div>
            <div className="hs-split">
                <ul className="hs-list">
                    {shown.length === 0 && <li className="hs-empty">Nothing matches. Try another filter, or clear the search.</li>}
                    {listed.map((l) => <li key={l.id}><button type="button" className={'hs-row' + (l.id === openId ? ' on' : '') + ((l.urgent || l.busy) && l.status === 'staff' && !l.resolved ? ' urgent' : '')} onClick={() => { setOpenId(l.id); setNote(''); if (window.innerWidth < 900) window.setTimeout(() => document.querySelector('.hs-detail')?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }), 60); }}>
                        <span className="hs-av">{l.name[0]}</span>
                        <span className="hs-row-main"><b>{l.name}{l.live && <u>New</u>}{l.urgent && !(l.busy && !l.resolved) && <u className="u">Urgent</u>}{l.busy && !l.resolved && <u className="u">Call now</u>}{l.rescheduled && <u className="r">Rescheduled</u>}</b><i>{l.treatment} · {l.clinic}</i></span>
                        <span className="hs-row-end"><span className={'hs-pill ' + (l.resolved ? 'booked' : l.status)}>{l.resolved ? 'Resolved' : LABEL[l.status]}</span><i>{l.status === 'staff' && !l.resolved && l.wait ? `waiting ${l.wait}` : l.received}</i></span>
                    </button></li>)}
                    {cut && <li><button type="button" className="hs-btn ghost" onClick={() => setMore(true)}>Show {shown.length - LIMIT} more enquiries</button></li>}
                </ul>
                <aside className="hs-detail" aria-live="polite">
                    {!open || !na ? <p className="hs-empty">Select an enquiry to see its summary.</p> : <>
                        <div className="hs-detail-top"><span className="hs-av lg">{open.name[0]}</span><div><h2>{open.name}</h2><p>{open.phone} · {open.language}</p></div><span className={'hs-pill ' + (open.resolved ? 'booked' : open.status)}>{open.resolved ? 'Resolved' : LABEL[open.status]}</span></div>
                        <div className={'hs-next ' + na.tone}><b>{na.title}</b><span>{na.text}</span></div>
                        {open.nervous && <div className="hs-gentle"><b>Prefers a gentle approach.</b> This patient told us they feel nervous about dental visits.</div>}
                        <dl className="hs-facts">
                            <div><dt>Needs</dt><dd>{open.treatment}</dd></div>
                            <div><dt>Clinic</dt><dd>{open.clinic}</dd></div>
                            <div><dt>Wants</dt><dd>{open.when}</dd></div>
                            <div><dt>Time to first call</dt><dd>{open.calledIn}</dd></div>
                            {open.scheduledFor && open.status === 'scheduled' && <div><dt>Call scheduled for</dt><dd>{open.scheduledFor}</dd></div>}
                            {open.slot && <div><dt>Appointment</dt><dd>{open.slot}</dd></div>}
                        </dl>
                        <h3>Summary</h3><p className="hs-sum">{open.summary}</p>
                        {open.answers.length > 0 && (mob ? <details className="hs-more" key={open.id}><summary>Patient's answers <em>{open.answers.length}</em></summary><ul className="hs-ans">{open.answers.map((a) => <li key={a.q}><span>{a.q}</span><b>{a.a}</b></li>)}</ul></details> : <><h3>Patient's answers</h3><ul className="hs-ans">{open.answers.map((a) => <li key={a.q}><span>{a.q}</span><b>{a.a}</b></li>)}</ul></>)}
                        {open.transcript.length > 0 && <details className="hs-callrec"><summary>Call record <em>{open.transcript.length} lines</em></summary><ul className="hs-tr">{open.transcript.map((t, i) => <li key={i} className={t.who === 'AI' ? 'ai' : ''}><b>{t.who === 'AI' ? 'Moli (assistant)' : 'Patient'}</b>{t.text}</li>)}</ul></details>}
                        {open.notes.length > 0 && <><h3>Team notes</h3><ul className="hs-notes">{open.notes.map((n, i) => <li key={i}>{n}</li>)}</ul></>}
                        <div className="hs-noteform"><input value={note} onChange={(e) => setNote(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && note.trim()) { update(open.id, { notes: [...open.notes, note.trim()] }); setNote(''); } }} placeholder="Add a note for your team" aria-label="Add a note" /><button type="button" className="hs-btn ghost small" disabled={!note.trim()} onClick={() => { update(open.id, { notes: [...open.notes, note.trim()] }); setNote(''); }}>Add</button></div>
                        <div className="hs-actions">
                            {open.status === 'staff' && !open.resolved && <button className="hs-btn" onClick={() => update(open.id, { resolved: true, wait: undefined, summary: open.summary + ' Staff took over and called the patient.' })}>I have called the patient</button>}
                            {open.status === 'scheduled' && <button className="hs-btn" onClick={() => update(open.id, { status: 'staff', reason: 'Staff chose to call before the scheduled time', wait: '1 min', calledIn: 'Called early by staff' })}>Call earlier myself</button>}
                            {open.status === 'noanswer' && <button className="hs-btn" onClick={() => update(open.id, { calledIn: 'Retry sent', summary: 'Another attempt is queued and the text message was resent.' })}>Ask Moli to retry now</button>}
                            {open.status === 'booked' && <button className="hs-btn ghost" onClick={() => update(open.id, { status: 'staff', reason: 'Staff review requested', wait: '1 min' })}>Ask a person to follow up</button>}
                        </div>
                    </>}
                </aside>
            </div>
        </>}

        {view === 'schedule' && <div className="hs-sched-view">
            <div className="hs-panel"><h2>Callbacks Moli will make</h2><p className="hs-sub">Patients who chose a time. You can step in earlier from the queue.</p>
                {pool.filter((l) => l.status === 'scheduled').length === 0 ? <p className="hs-empty">No scheduled calls.</p> : <ul className="hs-agenda">{pool.filter((l) => l.status === 'scheduled').map((l) => <li key={l.id}><button type="button" onClick={() => pick(l.id)}><time>{l.scheduledFor}</time><span><b>{l.name}</b><i>{l.treatment} · {l.clinic}</i></span></button></li>)}</ul>}
            </div>
            <div className="hs-panel"><h2>Appointments booked</h2><p className="hs-sub">Confirmed on a call. Patients receive a reminder.</p>
                {booked.length === 0 ? <p className="hs-empty">No bookings yet.</p> : <ul className="hs-agenda">{booked.map((l) => <li key={l.id}><button type="button" onClick={() => pick(l.id)}><time>{l.slot}</time><span><b>{l.name}</b><i>{l.treatment} · {l.clinic}</i></span></button></li>)}</ul>}
            </div>
        </div>}

        {view === 'insights' && <div className="hs-insights">
            <div className="hs-panel"><h2>From enquiry to booking</h2><p className="hs-sub">Answer rate and booking rate are shown separately, so a pick-up problem is never mistaken for a conversion problem.</p>
                {[['Enquiries received', pool.length, pool.length], ['Called so far', rated.length, pool.length], ['Picked up', answered.length, pool.length], ['Booked', booked.length, pool.length]].map(([t, n, d]) => <div className="hs-bar" key={t as string}><span>{t}</span><div><i style={{ width: `${pct(n as number, d as number)}%` }} /></div><b>{n}</b></div>)}
                <p className="hs-fine left">Scheduled calls are not counted as unanswered. They are waiting for their time.</p>
            </div>
            <div className="hs-panel"><h2>By clinic</h2><p className="hs-sub">Vertical line marks the 30% booking baseline from the case brief.</p>
                {CLINICS.map((c) => { const r = leads.filter((l) => l.clinic === c && l.status !== 'scheduled' && l.status !== 'calling'); const a = r.filter((l) => l.status !== 'noanswer').length; const b = r.filter((l) => l.status === 'booked').length; return <div className="hs-cl" key={c}><b>{c} <small>{r.length} calls in this sample</small></b><div className="hs-bar thin"><span>Answer</span><div><i style={{ width: `${pct(a, r.length)}%` }} /></div><em>{pct(a, r.length)}%</em></div><div className="hs-bar thin gold"><span>Booking</span><div className="base"><i style={{ width: `${pct(b, r.length)}%` }} /></div><em>{pct(b, r.length)}%</em></div></div>; })}
            </div>
            <div className="hs-panel wide"><h2>What we choose to measure</h2><p className="hs-sub">Booking rate against the baseline is the one number that matters. We deliberately do not track how many calls Moli finishes without a person, because that would reward keeping patients away from your team.</p></div>
        </div>}
        <p className="hs-fine center">Patient names, numbers and figures on this screen are illustrative sample data for the prototype. The 30% baseline is the figure given in the case brief.</p>
    </section>;
}

/* ---------------- App ---------------- */
export function App() {
    const [screen, setScreen] = useState<1 | 2>(typeof location !== 'undefined' && location.hash === '#2' ? 2 : 1);
    const [leads, setLeads] = useState<Lead[]>(seed);
    const [focus, setFocus] = useState<number | null>(null);
    function onNewLead(l: Lead): number {
        if ((l as any).__update) {
            const u = l as any;
            setLeads((ls) => ls.map((x) => x.id !== u.id ? x : u.human
                ? { ...x, live: true, status: 'staff', calledIn: '1 min 30 s', calledSecs: 90, busy: !!u.busy, reason: u.busy ? 'Transfer failed because no staff were free. Slot held by Moli' : x.urgent ? 'Severe pain, patient asked for a person' : 'Patient asked to speak to a person', wait: '1 min', summary: `${x.name} asked for a person during the call. Wants ${x.treatment.toLowerCase()} at ${x.clinic}.${x.nervous ? ' Feels nervous about dental visits.' : ''} Slot ${u.slot} is held for confirmation.${u.busy ? ' No one was free at the time of transfer, so Moli promised a call within about 10 minutes.' : ''}`, transcript: [{ who: 'AI', text: `Hi ${firstName(x.name)}, it's Moli, HappySmile's virtual assistant.` }, { who: 'Patient', text: 'Can I talk to someone?' }, u.busy ? { who: 'AI', text: `Nobody on the team is free just now. I'm holding your slot, and someone will ring you in about 10 minutes.` } : { who: 'AI', text: `Of course. I'm putting you through to the front desk now, with your details.` }] }
                : { ...x, live: true, status: 'booked', calledIn: '1 min 34 s', calledSecs: 94, slot: u.slot, summary: `${x.name} enquired about ${x.treatment.toLowerCase()} at ${x.clinic}, preferring a call in ${x.language}.${x.nervous ? ' Feels nervous about dental visits, so a gentle approach is appreciated.' : ''} Booked ${u.slot}.`, transcript: [{ who: 'AI', text: `Hi ${firstName(x.name)}, it's Moli, HappySmile's virtual assistant, about your ${x.treatment.toLowerCase()} enquiry.` }, { who: 'Patient', text: `${u.slot} works.` }, { who: 'AI', text: `That's booked at ${x.clinic}. A reminder will come before your visit.` }] }));
            setFocus(u.id);
            return u.id;
        }
        setLeads((ls) => [l, ...ls]);
        setFocus(l.id);
        return l.id;
    }
    function update(id: number, patch: Partial<Lead>) { setLeads((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l))); }
    return <div className="hs-app">
        <a className="hs-skip" href="#main">Skip to content</a>
        <header className="hs-top">
            <Brand />
            <nav className="hs-switch" aria-label="Prototype screens">
                <button className={screen === 1 ? 'on' : ''} aria-current={screen === 1} onClick={() => setScreen(1)}><span>1</span>Patient journey</button>
                <button className={screen === 2 ? 'on' : ''} aria-current={screen === 2} onClick={() => setScreen(2)}><span>2</span>Clinic dashboard</button>
            </nav>
        </header>
        <main id="main">{screen === 1 ? <Enquiry onNewLead={onNewLead} onGoStaff={() => setScreen(2)} leads={leads} update={update} /> : <Dashboard leads={leads} update={update} focusId={focus} />}</main>
        <footer className="hs-foot">Interactive prototype of the HappySmile instant callback · Sample data only · No real calls are placed</footer>
    </div>;
}
