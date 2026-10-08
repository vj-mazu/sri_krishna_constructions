import 'dotenv/config';
import pg from 'pg';
import { initializeDatabaseTables } from './init-db.js';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:12345@localhost:5432/sri_krishna_construction?schema=public',
  connectionTimeoutMillis: 10000,
});

const DEFAULT_MOBILE = '+919448986953';
const DEFAULT_PF = 'GBRCH1955403000';

const WORKER_REGISTRY_DATA = [
  // ==========================================
  // DIVISION 1: TM-1 (6 Workers)
  // ==========================================
  {
    workerId: 'SKC-E-01',
    fullName: 'MALLIKARJUN (TM-1)',
    mobileNumber: DEFAULT_MOBILE,
    fatherName: 'Sanna Venkatesh',
    designation: 'WELDER',
    dailyWage: 500,
    dailyAllowance: 6,
    otHourlyRate: 125,
    extraAmount: 0,
    advanceTaken: 0,
    advanceBalance: 0,
    bankAccountNo: '18132210023082',
    ifscCode: 'CNRB0011813',
    uanNumber: '102114072723',
    pfNumber: DEFAULT_PF,
    esiNumber: null,
    placeOfWork: 'UNIT1 TO 4 COMPRESSOR TURBINE',
    natureOfWork: 'MAINTENANCE',
    divisionName: 'TM-1'
  },
  {
    workerId: 'SKC-E-02',
    fullName: 'SRIKANTH',
    mobileNumber: DEFAULT_MOBILE,
    fatherName: 'Sanna Venkatesh',
    designation: 'HELPER',
    dailyWage: 500,
    dailyAllowance: 6,
    otHourlyRate: 125,
    extraAmount: 1500,
    advanceTaken: 0,
    advanceBalance: 0,
    bankAccountNo: '18132210027490',
    ifscCode: 'CNRB0011813',
    uanNumber: '102114072723',
    pfNumber: DEFAULT_PF,
    esiNumber: null,
    placeOfWork: 'UNIT1 TO 4 COMPRESSOR TURBINE',
    natureOfWork: 'MAINTENANCE',
    divisionName: 'TM-1'
  },
  {
    workerId: 'SKC-E-03',
    fullName: 'KSHEERALINGA',
    mobileNumber: DEFAULT_MOBILE,
    fatherName: 'Narasappa',
    designation: 'FITTER',
    dailyWage: 550,
    dailyAllowance: 56,
    otHourlyRate: 137.5,
    extraAmount: 1550,
    advanceTaken: 0,
    advanceBalance: 0,
    bankAccountNo: '18132200115005',
    ifscCode: 'CNRB0011813',
    uanNumber: '101859927314',
    pfNumber: DEFAULT_PF,
    esiNumber: null,
    placeOfWork: 'UNIT1 TO 4 COMPRESSOR TURBINE',
    natureOfWork: 'MAINTENANCE',
    divisionName: 'TM-1'
  },
  {
    workerId: 'SKC-E-04',
    fullName: 'MOUNESH',
    mobileNumber: DEFAULT_MOBILE,
    fatherName: 'Jangleppa',
    designation: 'SUPERVISOR',
    dailyWage: 600,
    dailyAllowance: 31,
    otHourlyRate: 150,
    extraAmount: 1800,
    advanceTaken: 0,
    advanceBalance: 0,
    bankAccountNo: '39414137303',
    ifscCode: 'SBIN0040452',
    uanNumber: '101781785218',
    pfNumber: DEFAULT_PF,
    esiNumber: null,
    placeOfWork: 'UNIT1 TO 4 COMPRESSOR TURBINE',
    natureOfWork: 'MAINTENANCE',
    divisionName: 'TM-1'
  },
  {
    workerId: 'SKC-E-05',
    fullName: 'RAMJEET KUMAR',
    mobileNumber: DEFAULT_MOBILE,
    fatherName: 'Kanhaiya',
    designation: 'WELDER',
    dailyWage: 733,
    dailyAllowance: 164,
    otHourlyRate: 183.25,
    extraAmount: 2000,
    advanceTaken: 0,
    advanceBalance: 0,
    bankAccountNo: '110166842332',
    ifscCode: 'CNRB0011813',
    uanNumber: '101748153885',
    pfNumber: DEFAULT_PF,
    esiNumber: null,
    placeOfWork: 'UNIT1 TO 4 COMPRESSOR TURBINE',
    natureOfWork: 'MAINTENANCE',
    divisionName: 'TM-1'
  },
  {
    workerId: 'SKC-E-06',
    fullName: 'PARUSHARAMULU Y',
    mobileNumber: DEFAULT_MOBILE,
    fatherName: 'Ranlingam',
    designation: 'HELPER',
    dailyWage: 500,
    dailyAllowance: 6,
    otHourlyRate: 125,
    extraAmount: 0,
    advanceTaken: 0,
    advanceBalance: 0,
    bankAccountNo: '110222334790',
    ifscCode: 'CNRB0011813',
    uanNumber: '102114079341',
    pfNumber: DEFAULT_PF,
    esiNumber: null,
    placeOfWork: 'UNIT1 TO 4 COMPRESSOR TURBINE',
    natureOfWork: 'MAINTENANCE',
    divisionName: 'TM-1'
  },

  // ==========================================
  // DIVISION 2: TM-2 (8 Workers)
  // ==========================================
  {
    workerId: 'SKC-E-07',
    fullName: 'KRISHNA CHOUDHARY',
    mobileNumber: DEFAULT_MOBILE,
    fatherName: 'Surendra Choudhary',
    designation: 'FITTER',
    dailyWage: 1166,
    dailyAllowance: 565,
    otHourlyRate: 291.5,
    extraAmount: 5000,
    advanceTaken: 160000,
    advanceBalance: 140000,
    bankAccountNo: '06222200019793',
    ifscCode: 'CNRB0010622',
    uanNumber: '100493430949',
    pfNumber: DEFAULT_PF,
    esiNumber: '7118394300',
    placeOfWork: 'UNIT5 TO 8 COMPRESSOR TURBINE',
    natureOfWork: 'MAINTENANCE',
    divisionName: 'TM-2'
  },
  {
    workerId: 'SKC-E-08',
    fullName: 'ALFRED DEEPAK',
    mobileNumber: DEFAULT_MOBILE,
    fatherName: 'Anand',
    designation: 'FOREMAN',
    dailyWage: 600,
    dailyAllowance: -48,
    otHourlyRate: 150,
    extraAmount: 7000,
    advanceTaken: 0,
    advanceBalance: 0,
    bankAccountNo: '64178636071',
    ifscCode: 'SBIN0040452',
    uanNumber: '102112948149',
    pfNumber: DEFAULT_PF,
    esiNumber: '7118728292',
    placeOfWork: 'UNIT5 TO 8 COMPRESSOR TURBINE',
    natureOfWork: 'MAINTENANCE',
    divisionName: 'TM-2'
  },
  {
    workerId: 'SKC-E-09',
    fullName: 'NAGESH',
    mobileNumber: DEFAULT_MOBILE,
    fatherName: 'Hanumanta',
    designation: 'SUPERVISOR',
    dailyWage: 1000,
    dailyAllowance: 399,
    otHourlyRate: 250,
    extraAmount: 0,
    advanceTaken: 10000,
    advanceBalance: 0,
    bankAccountNo: '110297784760',
    ifscCode: 'CNRB0011813',
    uanNumber: '101075875929',
    pfNumber: DEFAULT_PF,
    esiNumber: null,
    placeOfWork: 'UNIT5 TO 8 COMPRESSOR TURBINE',
    natureOfWork: 'MAINTENANCE',
    divisionName: 'TM-2'
  },
  {
    workerId: 'SKC-E-10',
    fullName: 'RAHUL KUMAR KASHYAP',
    mobileNumber: DEFAULT_MOBILE,
    fatherName: 'Anand Prakash Kashyap',
    designation: 'FITTER',
    dailyWage: 766.66,
    dailyAllowance: 266.66,
    otHourlyRate: 191.66,
    extraAmount: 3000,
    advanceTaken: 10000,
    advanceBalance: 0,
    bankAccountNo: '6222200029560',
    ifscCode: 'CNRB0010622',
    uanNumber: '101286370450',
    pfNumber: DEFAULT_PF,
    esiNumber: null,
    placeOfWork: 'UNIT5 TO 8 COMPRESSOR TURBINE',
    natureOfWork: 'MAINTENANCE',
    divisionName: 'TM-2'
  },
  {
    workerId: 'SKC-E-11',
    fullName: 'SUNIL',
    mobileNumber: DEFAULT_MOBILE,
    fatherName: 'Buddappa',
    designation: 'HELPER',
    dailyWage: 500,
    dailyAllowance: 150,
    otHourlyRate: 125,
    extraAmount: 1000,
    advanceTaken: 38500,
    advanceBalance: 35000,
    bankAccountNo: '110166747613',
    ifscCode: 'CNRB0011813',
    uanNumber: '102051597319',
    pfNumber: DEFAULT_PF,
    esiNumber: null,
    placeOfWork: 'UNIT5 TO 8 COMPRESSOR TURBINE',
    natureOfWork: 'MAINTENANCE',
    divisionName: 'TM-2'
  },
  {
    workerId: 'SKC-E-12',
    fullName: 'RAKESH',
    mobileNumber: DEFAULT_MOBILE,
    fatherName: 'Anjappa',
    designation: 'HELPER',
    dailyWage: 400,
    dailyAllowance: 50,
    otHourlyRate: 100,
    extraAmount: 0,
    advanceTaken: 10000,
    advanceBalance: 10000,
    bankAccountNo: '18132210028940',
    ifscCode: 'CNRB0011813',
    uanNumber: '102375323154',
    pfNumber: DEFAULT_PF,
    esiNumber: null,
    placeOfWork: 'UNIT5 TO 8 COMPRESSOR TURBINE',
    natureOfWork: 'MAINTENANCE',
    divisionName: 'TM-2'
  },
  {
    workerId: 'SKC-E-13',
    fullName: 'LAVA KUMAR',
    mobileNumber: DEFAULT_MOBILE,
    fatherName: 'Ramakrishna',
    designation: 'HELPER',
    dailyWage: 400,
    dailyAllowance: 50,
    otHourlyRate: 100,
    extraAmount: 0,
    advanceTaken: 0,
    advanceBalance: 0,
    bankAccountNo: '62501519833',
    ifscCode: 'SBIN0020197',
    uanNumber: null,
    pfNumber: DEFAULT_PF,
    esiNumber: null,
    placeOfWork: 'UNIT5 TO 8 COMPRESSOR TURBINE',
    natureOfWork: 'MAINTENANCE',
    divisionName: 'TM-2'
  },
  {
    workerId: 'SKC-E-14',
    fullName: 'MALLIKARJUN (TM-2)',
    mobileNumber: DEFAULT_MOBILE,
    fatherName: 'Anjinayya',
    designation: 'SUPERVISOR',
    dailyWage: 533,
    dailyAllowance: 83,
    otHourlyRate: 133.25,
    extraAmount: 0,
    advanceTaken: 0,
    advanceBalance: 0,
    bankAccountNo: '10802101029084',
    ifscCode: 'PKGB0010802',
    uanNumber: '102202705562',
    pfNumber: DEFAULT_PF,
    esiNumber: null,
    placeOfWork: 'UNIT5 TO 8 COMPRESSOR TURBINE',
    natureOfWork: 'MAINTENANCE',
    divisionName: 'TM-2'
  },

  // ==========================================
  // DIVISION 3: AHP-2 MAINTANCE (12 Workers)
  // ==========================================
  {
    workerId: 'SKC-E-15',
    fullName: 'KANHAIYA CHAUDHARY',
    mobileNumber: DEFAULT_MOBILE,
    fatherName: 'Virendra Chaudhary',
    designation: 'FITTER',
    dailyWage: 833,
    dailyAllowance: 274,
    otHourlyRate: 208.25,
    extraAmount: 0,
    advanceTaken: 0,
    advanceBalance: 0,
    bankAccountNo: '06222200025100',
    ifscCode: 'CNRB0010622',
    uanNumber: '101010216743',
    pfNumber: DEFAULT_PF,
    esiNumber: '2810503725',
    placeOfWork: 'UNIT 7 Bottam Ash',
    natureOfWork: 'MAINTENANCE',
    divisionName: 'AHP-2 MAINTANCE'
  },
  {
    workerId: 'SKC-E-16',
    fullName: 'SHIVA SHANKAR PASWAN',
    mobileNumber: DEFAULT_MOBILE,
    fatherName: 'Narayan Paswan',
    designation: 'HELPER',
    dailyWage: 500,
    dailyAllowance: -59,
    otHourlyRate: 125,
    extraAmount: 0,
    advanceTaken: 110000,
    advanceBalance: 100000,
    bankAccountNo: '110183189279',
    ifscCode: 'CNRB0011814',
    uanNumber: '102059324370',
    pfNumber: DEFAULT_PF,
    esiNumber: null,
    placeOfWork: 'UNIT 7 Bottam Ash',
    natureOfWork: 'MAINTENANCE',
    divisionName: 'AHP-2 MAINTANCE'
  },
  {
    workerId: 'SKC-E-17',
    fullName: 'RAJU BIND',
    mobileNumber: DEFAULT_MOBILE,
    fatherName: 'Lalmohar Bind',
    designation: 'WELDER',
    dailyWage: 600,
    dailyAllowance: -1,
    otHourlyRate: 150,
    extraAmount: 2000,
    advanceTaken: 2000,
    advanceBalance: 0,
    bankAccountNo: '40623860074',
    ifscCode: 'SBIN0018799',
    uanNumber: '101591203661',
    pfNumber: DEFAULT_PF,
    esiNumber: null,
    placeOfWork: 'UNIT 7 Bottam Ash',
    natureOfWork: 'MAINTENANCE',
    divisionName: 'AHP-2 MAINTANCE'
  },
  {
    workerId: 'SKC-E-18',
    fullName: 'BASAVARAJ',
    mobileNumber: DEFAULT_MOBILE,
    fatherName: 'Anjanayya',
    designation: 'HELPER',
    dailyWage: 500,
    dailyAllowance: -20,
    otHourlyRate: 125,
    extraAmount: 1000,
    advanceTaken: 1000,
    advanceBalance: 0,
    bankAccountNo: '39940201029',
    ifscCode: 'SBIN0040452',
    uanNumber: '101781782575',
    pfNumber: DEFAULT_PF,
    esiNumber: null,
    placeOfWork: 'UNIT 7 Bottam Ash',
    natureOfWork: 'MAINTENANCE',
    divisionName: 'AHP-2 MAINTANCE'
  },
  {
    workerId: 'SKC-E-19',
    fullName: 'AJAY',
    mobileNumber: DEFAULT_MOBILE,
    fatherName: 'Musafir',
    designation: 'WELDER',
    dailyWage: 600,
    dailyAllowance: 240,
    otHourlyRate: 150,
    extraAmount: 2000,
    advanceTaken: 2000,
    advanceBalance: 0,
    bankAccountNo: '057110192927',
    ifscCode: 'IPOS0000001',
    uanNumber: '102375325948',
    pfNumber: DEFAULT_PF,
    esiNumber: null,
    placeOfWork: 'UNIT 7 Bottam Ash',
    natureOfWork: 'MAINTENANCE',
    divisionName: 'AHP-2 MAINTANCE'
  },
  {
    workerId: 'SKC-E-20',
    fullName: 'JANARDHAN BIND',
    mobileNumber: DEFAULT_MOBILE,
    fatherName: 'Shivmurat Bind',
    designation: 'HELPER',
    dailyWage: 600,
    dailyAllowance: 240,
    otHourlyRate: 150,
    extraAmount: 1000,
    advanceTaken: 36000,
    advanceBalance: 36000,
    bankAccountNo: '026410110872',
    ifscCode: 'IPOS0000001',
    uanNumber: '102204081954',
    pfNumber: DEFAULT_PF,
    esiNumber: null,
    placeOfWork: 'UNIT 7 Bottam Ash',
    natureOfWork: 'MAINTENANCE',
    divisionName: 'AHP-2 MAINTANCE'
  },
  {
    workerId: 'SKC-E-21',
    fullName: 'SURENDRA BIND',
    mobileNumber: DEFAULT_MOBILE,
    fatherName: 'Anant Bind',
    designation: 'FITTER',
    dailyWage: 800,
    dailyAllowance: 320,
    otHourlyRate: 200,
    extraAmount: 2000,
    advanceTaken: 0,
    advanceBalance: 0,
    bankAccountNo: '110166840340',
    ifscCode: 'CNRB0011813',
    uanNumber: '101251434143',
    pfNumber: DEFAULT_PF,
    esiNumber: null,
    placeOfWork: 'UNIT 7 Bottam Ash',
    natureOfWork: 'MAINTENANCE',
    divisionName: 'AHP-2 MAINTANCE'
  },
  {
    workerId: 'SKC-E-22',
    fullName: 'RAJNISH KUMAR',
    mobileNumber: DEFAULT_MOBILE,
    fatherName: 'Ramvilash Ram',
    designation: 'CUTTER',
    dailyWage: 633,
    dailyAllowance: 183,
    otHourlyRate: 158.25,
    extraAmount: 3000,
    advanceTaken: 5800,
    advanceBalance: 2600,
    bankAccountNo: '38643189391',
    ifscCode: 'SBIN0015696',
    uanNumber: '101251434158',
    pfNumber: DEFAULT_PF,
    esiNumber: null,
    placeOfWork: 'UNIT 7 Bottam Ash',
    natureOfWork: 'MAINTENANCE',
    divisionName: 'AHP-2 MAINTANCE'
  },
  {
    workerId: 'SKC-E-23',
    fullName: 'ANIL KUMAR',
    mobileNumber: DEFAULT_MOBILE,
    fatherName: 'Hanumanta',
    designation: 'HELPER',
    dailyWage: 450,
    dailyAllowance: 100,
    otHourlyRate: 112.5,
    extraAmount: 0,
    advanceTaken: 5000,
    advanceBalance: 5000,
    bankAccountNo: '18132210023006',
    ifscCode: 'CNRB0011813',
    uanNumber: '101720011208',
    pfNumber: DEFAULT_PF,
    esiNumber: null,
    placeOfWork: 'UNIT 7 Bottam Ash',
    natureOfWork: 'MAINTENANCE',
    divisionName: 'AHP-2 MAINTANCE'
  },
  {
    workerId: 'SKC-E-24',
    fullName: 'VINOD (VINOD KUMAR)',
    mobileNumber: DEFAULT_MOBILE,
    fatherName: 'Anjappa',
    designation: 'HELPER',
    dailyWage: 400,
    dailyAllowance: 50,
    otHourlyRate: 100,
    extraAmount: 0,
    advanceTaken: 37029,
    advanceBalance: 27029,
    bankAccountNo: '41022201549',
    ifscCode: 'SBIN0040452',
    uanNumber: '102307892856',
    pfNumber: DEFAULT_PF,
    esiNumber: null,
    placeOfWork: 'UNIT 7 Bottam Ash',
    natureOfWork: 'MAINTENANCE',
    divisionName: 'AHP-2 MAINTANCE'
  },
  {
    workerId: 'SKC-E-25',
    fullName: 'VINAYAK KUMAR',
    mobileNumber: DEFAULT_MOBILE,
    fatherName: 'Musafir Chaudhari',
    designation: 'HELPER',
    dailyWage: 500,
    dailyAllowance: 200,
    otHourlyRate: 125,
    extraAmount: 0,
    advanceTaken: 2000,
    advanceBalance: 0,
    bankAccountNo: '42871209077',
    ifscCode: 'SBIN0003027',
    uanNumber: '102214728201',
    pfNumber: DEFAULT_PF,
    esiNumber: null,
    placeOfWork: 'UNIT 7 Bottam Ash',
    natureOfWork: 'MAINTENANCE',
    divisionName: 'AHP-2 MAINTANCE'
  },
  {
    workerId: 'SKC-E-26',
    fullName: 'RAJNATH VIND',
    mobileNumber: DEFAULT_MOBILE,
    fatherName: 'Rajan Vind',
    designation: 'WELDER',
    dailyWage: 600,
    dailyAllowance: 150,
    otHourlyRate: 150,
    extraAmount: 1000,
    advanceTaken: 0,
    advanceBalance: 0,
    bankAccountNo: '3899500702',
    ifscCode: 'CBIN0281260',
    uanNumber: '101894714003',
    pfNumber: DEFAULT_PF,
    esiNumber: null,
    placeOfWork: 'UNIT 7 Bottam Ash',
    natureOfWork: 'MAINTENANCE',
    divisionName: 'AHP-2 MAINTANCE'
  },

  // ==========================================
  // DIVISION 4: AHP-1 (10 Workers)
  // ==========================================
  {
    workerId: 'SKC-E-27',
    fullName: 'ANAND',
    mobileNumber: DEFAULT_MOBILE,
    fatherName: 'Buddappa',
    designation: 'HELPER',
    dailyWage: 550,
    dailyAllowance: 200,
    otHourlyRate: 137.5,
    extraAmount: 0,
    advanceTaken: 0,
    advanceBalance: 0,
    bankAccountNo: '42425835389',
    ifscCode: 'SBIN0016476',
    uanNumber: '102033619220',
    pfNumber: DEFAULT_PF,
    esiNumber: null,
    placeOfWork: 'Unit 3 & 4 RM Comp',
    natureOfWork: 'MAINTENANCE',
    divisionName: 'AHP-1'
  },
  {
    workerId: 'SKC-E-28',
    fullName: 'K MARUTHI',
    mobileNumber: DEFAULT_MOBILE,
    fatherName: 'Huligeppa',
    designation: 'ACCOUNTS / HELPER',
    dailyWage: 500,
    dailyAllowance: 200,
    otHourlyRate: 125,
    extraAmount: 3000,
    advanceTaken: 60000,
    advanceBalance: 60000,
    bankAccountNo: '924010024465780',
    ifscCode: 'UTIB0000412',
    uanNumber: '102113397396',
    pfNumber: DEFAULT_PF,
    esiNumber: null,
    placeOfWork: 'OFFICE',
    natureOfWork: 'A/C',
    divisionName: 'AHP-1'
  },
  {
    workerId: 'SKC-E-29',
    fullName: 'DEVAMMA',
    mobileNumber: DEFAULT_MOBILE,
    fatherName: null,
    designation: 'HELPER',
    dailyWage: 450,
    dailyAllowance: 100,
    otHourlyRate: 112.5,
    extraAmount: 0,
    advanceTaken: 0,
    advanceBalance: 0,
    bankAccountNo: null,
    ifscCode: null,
    uanNumber: null,
    pfNumber: DEFAULT_PF,
    esiNumber: null,
    placeOfWork: 'AHP-1',
    natureOfWork: 'MAINTENANCE',
    divisionName: 'AHP-1'
  },
  {
    workerId: 'SKC-E-30',
    fullName: 'RAHUL CHAUDHARY',
    mobileNumber: DEFAULT_MOBILE,
    fatherName: null,
    designation: 'HELPER',
    dailyWage: 450,
    dailyAllowance: 100,
    otHourlyRate: 112.5,
    extraAmount: 0,
    advanceTaken: 0,
    advanceBalance: 0,
    bankAccountNo: null,
    ifscCode: null,
    uanNumber: null,
    pfNumber: DEFAULT_PF,
    esiNumber: null,
    placeOfWork: 'AHP-1',
    natureOfWork: 'MAINTENANCE',
    divisionName: 'AHP-1'
  },
  {
    workerId: 'SKC-E-31',
    fullName: 'SURAJ RAJBHAR',
    mobileNumber: DEFAULT_MOBILE,
    fatherName: null,
    designation: 'HELPER',
    dailyWage: 500,
    dailyAllowance: 150,
    otHourlyRate: 125,
    extraAmount: 0,
    advanceTaken: 0,
    advanceBalance: 0,
    bankAccountNo: '110106707330',
    ifscCode: 'CNRB0010622',
    uanNumber: null,
    pfNumber: DEFAULT_PF,
    esiNumber: null,
    placeOfWork: 'AHP-1',
    natureOfWork: 'MAINTENANCE',
    divisionName: 'AHP-1'
  },
  {
    workerId: 'SKC-E-32',
    fullName: 'AMARJEET KUMAR',
    mobileNumber: DEFAULT_MOBILE,
    fatherName: null,
    designation: 'WELDER',
    dailyWage: 600,
    dailyAllowance: 150,
    otHourlyRate: 150,
    extraAmount: 0,
    advanceTaken: 0,
    advanceBalance: 0,
    bankAccountNo: '657302010006483',
    ifscCode: 'UBIN0565733',
    uanNumber: null,
    pfNumber: DEFAULT_PF,
    esiNumber: null,
    placeOfWork: 'AHP-1',
    natureOfWork: 'MAINTENANCE',
    divisionName: 'AHP-1'
  },
  {
    workerId: 'SKC-E-33',
    fullName: 'AJIT KUMAR KASHYAP',
    mobileNumber: DEFAULT_MOBILE,
    fatherName: null,
    designation: 'HELPER',
    dailyWage: 500,
    dailyAllowance: 150,
    otHourlyRate: 125,
    extraAmount: 0,
    advanceTaken: 0,
    advanceBalance: 0,
    bankAccountNo: '700702010003765',
    ifscCode: 'UBIN0570079',
    uanNumber: null,
    pfNumber: DEFAULT_PF,
    esiNumber: null,
    placeOfWork: 'AHP-1',
    natureOfWork: 'MAINTENANCE',
    divisionName: 'AHP-1'
  },
  {
    workerId: 'SKC-E-34',
    fullName: 'SANTOSH',
    mobileNumber: DEFAULT_MOBILE,
    fatherName: null,
    designation: 'HELPER',
    dailyWage: 500,
    dailyAllowance: 150,
    otHourlyRate: 125,
    extraAmount: 0,
    advanceTaken: 0,
    advanceBalance: 0,
    bankAccountNo: '304502019021367',
    ifscCode: 'UBIN0530450',
    uanNumber: null,
    pfNumber: DEFAULT_PF,
    esiNumber: null,
    placeOfWork: 'AHP-1',
    natureOfWork: 'MAINTENANCE',
    divisionName: 'AHP-1'
  },
  {
    workerId: 'SKC-E-35',
    fullName: 'SRI BHAGWAN',
    mobileNumber: DEFAULT_MOBILE,
    fatherName: null,
    designation: 'HELPER',
    dailyWage: 500,
    dailyAllowance: 150,
    otHourlyRate: 125,
    extraAmount: 0,
    advanceTaken: 0,
    advanceBalance: 0,
    bankAccountNo: '055110158182',
    ifscCode: 'IPOS0000001',
    uanNumber: null,
    pfNumber: DEFAULT_PF,
    esiNumber: null,
    placeOfWork: 'AHP-1',
    natureOfWork: 'MAINTENANCE',
    divisionName: 'AHP-1'
  },
  {
    workerId: 'SKC-E-36',
    fullName: 'JAGADISH',
    mobileNumber: DEFAULT_MOBILE,
    fatherName: null,
    designation: 'HELPER',
    dailyWage: 500,
    dailyAllowance: 150,
    otHourlyRate: 125,
    extraAmount: 0,
    advanceTaken: 0,
    advanceBalance: 0,
    bankAccountNo: '110167472647',
    ifscCode: 'CNRB0011813',
    uanNumber: null,
    pfNumber: DEFAULT_PF,
    esiNumber: null,
    placeOfWork: 'AHP-1',
    natureOfWork: 'MAINTENANCE',
    divisionName: 'AHP-1'
  }
];

export async function runManualWorkerSeed() {
  console.log('===========================================================');
  console.log('🚀 STARTING MANUAL WORKER REGISTRY SEEDING');
  console.log('===========================================================');

  try {
    // 1. Ensure DB tables and constraints exist
    await initializeDatabaseTables();

    // 2. Ensure the 4 Attendance Divisions exist
    const targetDivisions = [
      { name: 'TM-1', type: 'ATTENDANCE' },
      { name: 'TM-2', type: 'ATTENDANCE' },
      { name: 'AHP-2 MAINTANCE', type: 'ATTENDANCE' },
      { name: 'AHP-1', type: 'ATTENDANCE' }
    ];

    const divisionMap = new Map();

    for (const div of targetDivisions) {
      // Find or insert division
      let divRes = await pool.query(
        `SELECT id, name FROM "Division" WHERE LOWER(name) = LOWER($1) AND type = $2 LIMIT 1`,
        [div.name, div.type]
      );

      if (divRes.rows.length === 0) {
        divRes = await pool.query(
          `INSERT INTO "Division" ("id", "name", "type", "isActive", "createdAt", "updatedAt")
           VALUES (gen_random_uuid()::text, $1, $2, true, NOW(), NOW())
           RETURNING id, name`,
          [div.name, div.type]
        );
        console.log(`✅ Created Attendance Division: "${div.name}" (ID: ${divRes.rows[0].id})`);
      } else {
        console.log(`ℹ️ Division already exists: "${div.name}" (ID: ${divRes.rows[0].id})`);
      }
      divisionMap.set(div.name, divRes.rows[0].id);
    }

    // 3. Upsert all 36 workers
    let createdCount = 0;
    let updatedCount = 0;

    for (const w of WORKER_REGISTRY_DATA) {
      const divisionId = divisionMap.get(w.divisionName);
      if (!divisionId) {
        throw new Error(`Division '${w.divisionName}' not found in divisionMap!`);
      }

      const upsertSql = `
        INSERT INTO "Worker" (
          "id", "workerId", "fullName", "mobileNumber", "fatherName", "designation",
          "dailyWage", "dailyAllowance", "otHourlyRate", "extraAmount",
          "advanceTaken", "advanceBalance", "bankAccountNo", "ifscCode",
          "uanNumber", "pfNumber", "esiNumber", "placeOfWork", "natureOfWork",
          "divisionId", "isActive", "createdAt", "updatedAt"
        ) VALUES (
          gen_random_uuid()::text, $1, $2, $3, $4, $5,
          $6, $7, $8, $9,
          $10, $11, $12, $13,
          $14, $15, $16, $17, $18,
          $19, true, NOW(), NOW()
        )
        ON CONFLICT ("workerId") DO UPDATE SET
          "fullName" = EXCLUDED."fullName",
          "mobileNumber" = EXCLUDED."mobileNumber",
          "fatherName" = EXCLUDED."fatherName",
          "designation" = EXCLUDED."designation",
          "dailyWage" = EXCLUDED."dailyWage",
          "dailyAllowance" = EXCLUDED."dailyAllowance",
          "otHourlyRate" = EXCLUDED."otHourlyRate",
          "extraAmount" = EXCLUDED."extraAmount",
          "advanceTaken" = EXCLUDED."advanceTaken",
          "advanceBalance" = EXCLUDED."advanceBalance",
          "bankAccountNo" = EXCLUDED."bankAccountNo",
          "ifscCode" = EXCLUDED."ifscCode",
          "uanNumber" = EXCLUDED."uanNumber",
          "pfNumber" = EXCLUDED."pfNumber",
          "esiNumber" = EXCLUDED."esiNumber",
          "placeOfWork" = EXCLUDED."placeOfWork",
          "natureOfWork" = EXCLUDED."natureOfWork",
          "divisionId" = EXCLUDED."divisionId",
          "isActive" = EXCLUDED."isActive",
          "updatedAt" = NOW()
        RETURNING (xmax = 0) AS is_inserted, *;
      `;

      const values = [
        w.workerId,
        w.fullName,
        w.mobileNumber,
        w.fatherName,
        w.designation,
        w.dailyWage,
        w.dailyAllowance,
        w.otHourlyRate,
        w.extraAmount,
        w.advanceTaken,
        w.advanceBalance,
        w.bankAccountNo,
        w.ifscCode,
        w.uanNumber,
        w.pfNumber,
        w.esiNumber,
        w.placeOfWork,
        w.natureOfWork,
        divisionId
      ];

      const res = await pool.query(upsertSql, values);
      const row = res.rows[0];

      if (row.is_inserted) {
        createdCount++;
      } else {
        updatedCount++;
      }

      // If worker has advance taken, record opening AdvanceTransaction if not already recorded
      if (w.advanceTaken > 0) {
        const advTxCheck = await pool.query(
          `SELECT id FROM "AdvanceTransaction" WHERE "workerId" = $1 AND "reason" = 'OPENING_ADVANCE' LIMIT 1`,
          [row.id]
        );
        if (advTxCheck.rows.length === 0) {
          await pool.query(
            `INSERT INTO "AdvanceTransaction" ("id", "workerId", "type", "date", "amount", "balanceAfter", "source", "reason", "createdAt")
             VALUES (gen_random_uuid()::text, $1, 'DISBURSEMENT', NOW(), $2, $3, 'MANUAL_ADVANCE', 'OPENING_ADVANCE', NOW())`,
            [row.id, w.advanceTaken, w.advanceBalance]
          );
        }
      }

      console.log(`[${w.workerId}] ${w.fullName.padEnd(25)} -> ${w.divisionName.padEnd(16)} | Wage: ₹${String(w.dailyWage).padStart(4)}/d | AdvBal: ₹${w.advanceBalance}`);
    }

    console.log('===========================================================');
    console.log(`🎉 COMPLETED WORKER REGISTRY SEEDING!`);
    console.log(`   Total Processed : ${WORKER_REGISTRY_DATA.length}`);
    console.log(`   Newly Inserted  : ${createdCount}`);
    console.log(`   Updated Existing: ${updatedCount}`);
    console.log(`   Divisions Active: 4 (TM-1, TM-2, AHP-2 MAINTANCE, AHP-1)`);
    console.log('===========================================================');
  } catch (err) {
    console.error('❌ SEEDING ERROR:', err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

// Execute when run directly via CLI
if (process.argv[1] && process.argv[1].endsWith('seed-workers.js')) {
  runManualWorkerSeed();
}
