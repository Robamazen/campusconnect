require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Event = require('./models/Event');
const Registration = require('./models/Registration');

const SEED_PASSWORD = 'Passw0rd!';

const daysFromNow = (n, hour = 17) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(hour, 0, 0, 0);
  return d;
};

const CLUB_LEADERS = [
  { name: 'Youssef Adel', email: 'youssef.adel@giu-uni.edu.eg', club: 'GIU Robotics & AI Club', bio: 'President of the Robotics & AI Club. Mechatronics engineering, Class of 2027.' },
  { name: 'Farida El-Sayed', email: 'farida.elsayed@giu-uni.edu.eg', club: 'ACM GIU Student Chapter', bio: 'Chair of the ACM GIU Student Chapter. Computer Science major, competitive programmer.' },
  { name: 'Ahmed Nabil', email: 'ahmed.nabil@giu-uni.edu.eg', club: 'IEEE GIU Student Branch', bio: 'Chairperson, IEEE GIU Student Branch. Electronics & communications engineering.' },
  { name: 'Nour Hassan', email: 'nour.hassan@giu-uni.edu.eg', club: 'GIU Debate & Model UN Society', bio: 'Secretary-General of GIU MUN. Political science and international relations.' },
  { name: 'Omar Kamal', email: 'omar.kamal@giu-uni.edu.eg', club: 'GIU Football Club', bio: 'Captain and organizer, GIU Football Club.' },
  { name: 'Mariam Fathy', email: 'mariam.fathy@giu-uni.edu.eg', club: 'GIU Media & Photography Club', bio: 'Head of GIU Media & Photography Club. Mass communication senior.' },
  { name: 'Kareem Tarek', email: 'kareem.tarek@giu-uni.edu.eg', club: 'Enactus GIU', bio: 'President of Enactus GIU, building student-led social ventures.' },
  { name: 'Habiba Mostafa', email: 'habiba.mostafa@giu-uni.edu.eg', club: 'GIU Fine Arts & Culture Club', bio: 'Founder of the Fine Arts & Culture Club. Pharmacy student and painter.' },
  { name: 'Ziad Ashraf', email: 'ziad.ashraf@giu-uni.edu.eg', club: 'Resala GIU', bio: 'Coordinator, Resala GIU chapter — community and charity work around New Cairo.' },
  { name: 'Malak Ahmed', email: 'malak.ahmed@giu-uni.edu.eg', club: 'GIU Business & Finance Society', bio: 'President of the Business & Finance Society. Finance major.' },
  { name: 'Rana Sherif', email: 'rana.sherif@giu-uni.edu.eg', club: 'GIU Gaming & Esports Club', bio: 'Founder of the GIU Gaming & Esports Club.' }
];

const ADMIN = { name: 'GIU Campus Connect Admin', email: 'admin@giu-uni.edu.eg', bio: 'Platform administrator for GIU Campus Connect.' };

const STUDENTS = [
  'Yara Mahmoud', 'Mohamed Reda', 'Dina Wael', 'Layla Samir', 'Hassan Fouad',
  'Nada Gamal', 'Salma Ibrahim', 'Karim El-Masry', 'Ahmed Tamer', 'Mona Adly',
  'Sara Khaled', 'Amr Fathallah', 'Rowan Sameh', 'Mostafa Younis', 'Jana Adel'
].map((name) => ({
  name,
  email: `${name.toLowerCase().replace(/\s+/g, '.').replace(/[^a-z.]/g, '')}@student.giu-uni.edu.eg`
}));

// club key matches CLUB_LEADERS[].club, used to wire createdBy + realistic requirements
const EVENTS = [
  {
    title: 'Intro to ROS: Building Your First Robot',
    club: 'GIU Robotics & AI Club',
    description: 'A hands-on workshop covering the Robot Operating System (ROS) basics — nodes, topics, and simulating a differential-drive robot in Gazebo. Laptops with Ubuntu (or a VM) required.',
    requirements: ['Laptop with Ubuntu 20.04+ or VM', 'Basic Python knowledge'],
    location: 'Building C5 - Innovation Hub, Lab 2',
    eventDate: daysFromNow(6, 15),
    type: 'workshop',
    category: 'Tech',
    totalSlots: 30
  },
  {
    title: 'GIU Hackathon 2026: Smart Campus Challenge',
    club: 'ACM GIU Student Chapter',
    description: '24-hour hackathon where teams build solutions for smarter campus life — parking, scheduling, sustainability. Prizes for top 3 teams, mentors from local tech companies on-site.',
    requirements: ['Team of 2-4', 'Own laptop', 'GitHub account'],
    location: 'GIU Auditorium',
    eventDate: daysFromNow(18, 10),
    type: 'competition',
    category: 'Tech',
    totalSlots: 120
  },
  {
    title: 'IEEE Xtreme Programming Bootcamp',
    club: 'IEEE GIU Student Branch',
    description: 'Prep sessions ahead of IEEEXtreme — competitive programming drills covering graphs, DP, and greedy algorithms with past problem sets.',
    requirements: ['Familiarity with C++ or Java'],
    location: 'Building C3 - Lecture Hall 4',
    eventDate: daysFromNow(3, 16),
    type: 'workshop',
    category: 'Tech',
    totalSlots: 60
  },
  {
    title: 'GIU Model United Nations Conference',
    club: 'GIU Debate & Model UN Society',
    description: 'Annual GIU MUN conference simulating UN committees — Security Council, UNHCR, and ECOSOC. Open to delegates from all majors, position papers due before the event.',
    requirements: ['Submit a position paper', 'Formal dress code'],
    location: 'GIU Auditorium',
    eventDate: daysFromNow(25, 9),
    type: 'competition',
    category: 'Academic',
    totalSlots: 150
  },
  {
    title: 'Public Speaking & Debate Night',
    club: 'GIU Debate & Model UN Society',
    description: 'Open-mic style debate night practicing British Parliamentary format. Great for first-timers looking to build confidence in public speaking.',
    requirements: [],
    location: 'Building A1 - Conference Room 3',
    eventDate: daysFromNow(9, 18),
    type: 'social',
    category: 'Academic',
    totalSlots: 40
  },
  {
    title: 'GIU Football Cup - Semi Finals',
    club: 'GIU Football Club',
    description: 'Inter-faculty football semi-finals. Come support your faculty team at the GIU Sports Complex — snacks and drinks on site.',
    requirements: [],
    location: 'Sports Complex - Main Pitch',
    eventDate: daysFromNow(4, 17),
    type: 'competition',
    category: 'Sports',
    totalSlots: 200
  },
  {
    title: 'Sunset Futsal Tournament',
    club: 'GIU Football Club',
    description: 'Casual 5-a-side futsal tournament, teams formed on the spot. Just show up with sports shoes.',
    requirements: ['Sports shoes'],
    location: 'Sports Complex - Court A',
    eventDate: daysFromNow(-4, 18),
    type: 'social',
    category: 'Sports',
    totalSlots: 40
  },
  {
    title: 'Photography Walk: New Cairo Golden Hour',
    club: 'GIU Media & Photography Club',
    description: 'Golden-hour photo walk around campus and the New Cairo skyline. Bring any camera, phones welcome — tips on composition and light shared along the way.',
    requirements: ['A camera or smartphone'],
    location: 'Central Plaza (meeting point)',
    eventDate: daysFromNow(7, 16),
    type: 'social',
    category: 'Arts',
    totalSlots: 25
  },
  {
    title: 'Short Film Production Masterclass',
    club: 'GIU Media & Photography Club',
    description: 'From storyboard to final cut: a two-hour masterclass on producing short films on a student budget, led by alumni now working in Egyptian film production.',
    requirements: [],
    location: 'Building C7 - Media Studio',
    eventDate: daysFromNow(14, 15),
    type: 'workshop',
    category: 'Arts',
    totalSlots: 35
  },
  {
    title: 'Enactus GIU Pitch Day',
    club: 'Enactus GIU',
    description: 'Student teams pitch social enterprise projects to a panel of judges from partner companies. Open floor for feedback and networking after the pitches.',
    requirements: ['RSVP as audience or register your team separately'],
    location: 'Building A1 - Conference Room 1',
    eventDate: daysFromNow(21, 11),
    type: 'competition',
    category: 'Academic',
    totalSlots: 80
  },
  {
    title: 'Startup Weekend: Idea to MVP',
    club: 'Enactus GIU',
    description: 'A 48-hour build sprint from idea validation to a working MVP, with mentorship checkpoints from the Enactus alumni network.',
    requirements: ['Team of up to 5', 'Laptop'],
    location: 'Building C5 - Innovation Hub',
    eventDate: daysFromNow(32, 9),
    type: 'workshop',
    category: 'Tech',
    totalSlots: 60
  },
  {
    title: 'GIU Fine Arts Exhibition Opening',
    club: 'GIU Fine Arts & Culture Club',
    description: 'Opening night for the semester exhibition featuring paintings, ceramics, and mixed media from GIU students. Light refreshments served.',
    requirements: [],
    location: 'Library Rooftop Gallery',
    eventDate: daysFromNow(11, 19),
    type: 'social',
    category: 'Arts',
    totalSlots: 100
  },
  {
    title: 'Orphanage Visit & Donation Day',
    club: 'Resala GIU',
    description: "Bus trip to partner with a local orphanage in New Cairo — games, activities, and delivering donated clothes and school supplies collected on campus.",
    requirements: ['Sign the volunteer consent form'],
    location: 'Meeting point: Main Gate, GIU Campus',
    eventDate: daysFromNow(10, 9),
    type: 'volunteering',
    category: 'Volunteering',
    totalSlots: 45
  },
  {
    title: 'Nile Cleanup Initiative',
    club: 'Resala GIU',
    description: 'Joint cleanup drive along a Nile-side stretch, in partnership with a Cairo environmental NGO. Gloves and bags provided, wear clothes you don’t mind getting dirty.',
    requirements: ['Comfortable clothes', 'Closed shoes'],
    location: 'Off-campus — transport provided from Main Gate',
    eventDate: daysFromNow(-10, 8),
    type: 'volunteering',
    category: 'Volunteering',
    totalSlots: 50
  },
  {
    title: 'Trading & Investment 101',
    club: 'GIU Business & Finance Society',
    description: 'Beginner-friendly session on the Egyptian Exchange (EGX), reading financial statements, and building a first paper portfolio.',
    requirements: [],
    location: 'Building C3 - Lecture Hall 2',
    eventDate: daysFromNow(5, 17),
    type: 'workshop',
    category: 'Academic',
    totalSlots: 70
  },
  {
    title: 'Case Study Competition: Egyptian Markets',
    club: 'GIU Business & Finance Society',
    description: 'Teams analyze a real anonymized case from an Egyptian retail brand and pitch a growth strategy to a judging panel of alumni.',
    requirements: ['Team of 3-4', 'Business or economics background helpful'],
    location: 'Building A1 - Conference Room 2',
    eventDate: daysFromNow(28, 10),
    type: 'competition',
    category: 'Academic',
    totalSlots: 60
  },
  {
    title: 'Board Game & Console Night',
    club: 'GIU Gaming & Esports Club',
    description: 'Casual board games, FIFA, and Smash tournaments running side by side. Bring a friend or come solo, everyone gets paired up.',
    requirements: [],
    location: 'Cafeteria Terrace',
    eventDate: daysFromNow(2, 19),
    type: 'social',
    category: 'Social',
    totalSlots: 80
  },
  {
    title: 'Valorant 5v5 Campus Cup',
    club: 'GIU Gaming & Esports Club',
    description: 'Bracket-style Valorant tournament, GIU teams only. Discord required for team coordination, bring your own peripherals if you have a preference.',
    requirements: ['Team of 5', 'Discord account'],
    location: 'Building C5 - Esports Lounge',
    eventDate: daysFromNow(16, 14),
    type: 'competition',
    category: 'Tech',
    totalSlots: 40
  },
  {
    title: 'Welcome Back Social Mixer',
    club: 'GIU Student Activities Office',
    description: 'Kick off the semester with music, food trucks, and club booths across Central Plaza. All clubs will be there to recruit new members.',
    requirements: [],
    location: 'Central Plaza',
    eventDate: daysFromNow(1, 16),
    type: 'social',
    category: 'Social',
    totalSlots: 500
  },
  {
    title: 'Career Fair 2026',
    club: 'GIU Career Center',
    description: 'Annual career fair with recruiters from multinational and Egyptian companies across engineering, business, and pharmacy. Bring printed CVs.',
    requirements: ['Printed CV', 'Business casual attire'],
    location: 'GIU Auditorium',
    eventDate: daysFromNow(-2, 10),
    type: 'other',
    category: 'Other',
    totalSlots: 400
  }
];

async function upsertUser({ name, email, bio, role, status }) {
  let user = await User.findOne({ email });
  if (user) return user;
  const hashed = await bcrypt.hash(SEED_PASSWORD, 10);
  user = await User.create({
    name,
    email,
    password: hashed,
    bio: bio || '',
    role: role || 'student',
    status: status || 'approved'
  });
  return user;
}

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  const admin = await upsertUser({ ...ADMIN, role: 'admin', status: 'approved' });
  console.log(`Admin ready: ${admin.email}`);

  const leaderByClub = {};
  for (const leader of CLUB_LEADERS) {
    const user = await upsertUser({ name: leader.name, email: leader.email, bio: leader.bio, role: 'clubLeader', status: 'approved' });
    leaderByClub[leader.club] = user;
  }
  console.log(`${CLUB_LEADERS.length} club leaders ready`);

  const students = [];
  for (const s of STUDENTS) {
    const user = await upsertUser({ name: s.name, email: s.email, role: 'student', status: 'approved' });
    students.push(user);
  }
  console.log(`${students.length} students ready`);

  // Fallback creator for clubs not tied to a specific club-leader account (Student Activities Office / Career Center)
  const fallbackCreator = admin;

  const createdEvents = [];
  for (const evt of EVENTS) {
    let event = await Event.findOne({ title: evt.title, club: evt.club });
    if (!event) {
      const createdBy = leaderByClub[evt.club] || fallbackCreator;
      event = await Event.create({
        title: evt.title,
        club: evt.club,
        description: evt.description,
        requirements: evt.requirements,
        location: evt.location,
        eventDate: evt.eventDate,
        type: evt.type,
        category: evt.category,
        totalSlots: evt.totalSlots,
        status: evt.eventDate < new Date() ? 'closed' : 'open',
        createdBy: createdBy._id,
        filledSlots: 0
      });
    }
    createdEvents.push(event);
  }
  console.log(`${createdEvents.length} events ready`);

  // Sprinkle RSVPs so capacity bars/near-full states look real on the feed
  let registrationCount = 0;
  for (const event of createdEvents) {
    if (!event.totalSlots) continue;
    const pastEvent = event.eventDate < new Date();
    const targetFill = pastEvent
      ? event.totalSlots // past events read as fully attended
      : Math.min(event.totalSlots, Math.floor(event.totalSlots * (0.15 + Math.random() * 0.7)));
    const pool = [...students].sort(() => Math.random() - 0.5);
    let filled = event.filledSlots;
    for (const student of pool) {
      if (filled >= targetFill) break;
      const exists = await Registration.findOne({ user: student._id, event: event._id });
      if (exists) continue;
      await Registration.create({
        user: student._id,
        event: event._id,
        status: pastEvent ? 'confirmed' : 'confirmed',
        registeredAt: new Date(event.eventDate.getTime() - (1 + Math.random() * 10) * 86400000)
      });
      filled += 1;
      registrationCount += 1;
    }
    if (filled !== event.filledSlots) {
      event.filledSlots = filled;
      if (event.totalSlots && filled >= event.totalSlots && !pastEvent) {
        // leave status "open" (frontend derives "full" from slots) unless the event is already past
      }
      await event.save();
    }
  }
  console.log(`${registrationCount} registrations created`);

  console.log('\nSeed complete.');
  console.log(`All seeded accounts use the password: ${SEED_PASSWORD}`);
  console.log(`Sample login -> student: ${students[0].email} / ${SEED_PASSWORD}`);
  console.log(`Sample login -> club leader: ${CLUB_LEADERS[0].email} / ${SEED_PASSWORD}`);
  console.log(`Sample login -> admin: ${admin.email} / ${SEED_PASSWORD}`);

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
