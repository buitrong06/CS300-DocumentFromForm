import type {
  TemplateFieldConfig,
  FormValues,
  RuleFinding,
  CorrectionSuggestion,
  SubmissionSnapshot,
  DelegatedFieldResult,
  ProvenanceLog,
} from './types';

export const INITIAL_TEMPLATE_FIELDS: TemplateFieldConfig[] = [
  {
    id: 'f1',
    key: 'faculty',
    label: 'Khoa',
    type: 'choice',
    required: true,
    positionsCount: 1,
    instructions: 'Chọn khoa bạn đang theo học.',
    sourceNote: 'Tự đoán từ nhãn · đổi được',
  },
  {
    id: 'f2',
    key: 'full_name',
    label: 'Họ và tên',
    type: 'short_text',
    required: true,
    positionsCount: 2,
    instructions: 'Ghi đầy đủ họ và tên theo giấy khai sinh.',
    sourceNote: '2 vị trí trong văn bản',
  },
  {
    id: 'f3',
    key: 'dob',
    label: 'Ngày sinh',
    type: 'date',
    required: true,
    positionsCount: 1,
    instructions: 'Định dạng ngày/tháng/năm.',
    sourceNote: 'Tự đoán từ nhãn · đổi được',
  },
  {
    id: 'f4',
    key: 'student_id',
    label: 'MSSV',
    type: 'short_text',
    required: true,
    positionsCount: 1,
    instructions: 'Mã số sinh viên gồm 8 chữ số.',
    sourceNote: 'Tự đoán từ nhãn · đổi được',
  },
  {
    id: 'f5',
    key: 'class_name',
    label: 'Lớp',
    type: 'short_text',
    required: false,
    positionsCount: 1,
    instructions: 'Mã lớp sinh hoạt (ví dụ: 23CTT1).',
    sourceNote: 'Tự đoán từ nhãn · đổi được',
  },
  {
    id: 'f6',
    key: 'phone',
    label: 'Số điện thoại',
    type: 'short_text',
    required: true,
    positionsCount: 1,
    instructions: 'Số điện thoại cá nhân liên lạc được.',
    sourceNote: 'Tự đoán từ nhãn · đổi được',
  },
  {
    id: 'f7',
    key: 'from_date',
    label: 'Nghỉ từ ngày',
    type: 'date',
    required: true,
    positionsCount: 1,
    instructions: 'Ngày bắt đầu xin tạm nghỉ.',
    sourceNote: 'Tự đoán từ nhãn · đổi được',
  },
  {
    id: 'f8',
    key: 'to_date',
    label: 'Đến ngày',
    type: 'date',
    required: true,
    positionsCount: 1,
    instructions: 'Ngày kết thúc thời gian nghỉ dự kiến.',
    sourceNote: 'Tự đoán từ nhãn · đổi được',
  },
  {
    id: 'f9',
    key: 'reason',
    label: 'Lý do',
    type: 'long_text',
    required: true,
    positionsCount: 1,
    instructions:
      'Nêu rõ lý do xin nghỉ (sức khỏe, gia đình, ...). Nếu nghỉ vì lý do sức khỏe, ghi rõ giấy tờ minh chứng sẽ nộp kèm.',
    sourceNote: 'Tự đoán từ nhãn · đổi được',
  },
];

export const INITIAL_FORM_VALUES: FormValues = {
  unit: 'Chi đoàn 23CTT1',
  createDate: '2026-10-29',
  activityName: 'Ngày hội Tân sinh viên 2026',
  eventDate: '2026-11-15',
  location: 'Sảnh tòa I, cơ sở Nguyễn Văn Cừ',
  purpose:
    'Giúp tân sinh viên làm quen với môi trường học tập và các hoạt động phong trào của Khoa. Chương trình dành cho',
  programSchedule: '',
  totalBudget: 0,
  signatory: 'Trần Minh Khoa',
  budgetDetail: '',
};

export const INITIAL_RULE_FINDINGS: RuleFinding[] = [
  {
    id: 'rf-1',
    type: 'rule',
    fieldName: 'Tổng kinh phí',
    fieldKey: 'totalBudget',
    title: 'Luật · Tổng kinh phí',
    message: 'Trường bắt buộc chưa được điền.',
  },
  {
    id: 'rf-2',
    type: 'rule',
    fieldName: 'Thời gian tổ chức',
    fieldKey: 'eventDate',
    title: 'Luật · Thời gian tổ chức',
    message: 'Phải sau ngày lập (29/10/2026). Giá trị hiện tại: 15/10/2026.',
  },
  {
    id: 'rf-3',
    type: 'semantic',
    fieldName: 'Mục đích',
    fieldKey: 'purpose',
    title: 'Nội dung · Mục đích',
    message: 'Chưa nêu đối tượng tham gia. Đoạn gần nhất chỉ nói về giao lưu, không nói ai tham gia:',
    evidence: '"đồng thời tạo cơ hội giao lưu giữa các khóa"',
    criterion: 'Tiêu chí: "Nêu mục đích và đối tượng tham gia"',
  },
  {
    id: 'rf-4',
    type: 'uncertain',
    fieldName: 'Nội dung chương trình',
    fieldKey: 'programSchedule',
    title: 'Không chắc chắn · Nội dung chương trình',
    message:
      'Không đủ bằng chứng để xác định các hoạt động đã đúng trình tự thời gian hay chưa. Bạn tự kiểm tra lại.',
    criterion: 'Tiêu chí: "Liệt kê các hoạt động chính theo trình tự thời gian"',
  },
];

export const INITIAL_CORRECTION_SUGGESTIONS: CorrectionSuggestion[] = [
  {
    id: 'cs-1',
    fieldKey: 'purpose',
    fieldName: 'Mục đích',
    type: 'punctuation',
    summary: 'thêm "," · dấu câu · Mục đích',
    originalText: 'Khoa',
    suggestedText: 'Khoa,',
    contextText: 'các hoạt động phong trào của Khoa đồng thời tạo cơ hội',
  },
  {
    id: 'cs-2',
    fieldKey: 'purpose',
    fieldName: 'Mục đích',
    type: 'spelling',
    summary: 'đoan → đoàn · chính tả · Mục đích',
    originalText: 'đoan',
    suggestedText: 'đoàn',
    contextText: 'tinh thần đoan kết trong Khoa.',
  },
  {
    id: 'cs-3',
    fieldKey: 'programSchedule',
    fieldName: 'Nội dung chương trình',
    type: 'punctuation',
    summary: '";" → ":" · dấu câu · Nội dung chương trình',
    originalText: ';',
    suggestedText: ':',
    contextText: 'Giao lưu cùng cựu sinh viên; bế mạc lúc 11h30.',
  },
];

export const INITIAL_SUBMISSIONS: SubmissionSnapshot[] = [
  {
    id: 'sub-2',
    submissionCode: 'SUB-2026-0412',
    recipientName: 'Lê Văn Uy',
    recipientAvatar: 'LU',
    subtaskNumber: 1,
    submissionIndex: 2,
    timestamp: '29/10/2026 14:20',
    versionLabel: 'mẫu v1',
    status: 'pending',
    content: {
      programSchedule: `• 8h00: Khai mạc, giới thiệu Khoa và Đoàn – Hội.
• 9h00: Gian hàng câu lạc bộ, trò chơi tập thể.
• 10h30: Giao lưu cùng cựu sinh viên; bế mạc lúc 11h30.`,
    },
    previousContent: {
      programSchedule: `• 8h00: Khai mạc, giới thiệu Khoa và Đoàn – Hội.
• 9h00: Gian hàng câu lạc bộ, trò chơi tập thể.
• 10h00: Bế mạc.`,
    },
    autoCheckSummary: {
      rulesPassed: 1,
      rulesTotal: 1,
      warnings: ['Chưa ghi giờ kết thúc của hoạt động 9h00'],
    },
    reviewComment: 'Đã bổ sung phần giao lưu, trình tự hợp lý. Tốt.',
  },
  {
    id: 'sub-1',
    submissionCode: 'SUB-2026-0398',
    recipientName: 'Lê Văn Uy',
    recipientAvatar: 'LU',
    subtaskNumber: 1,
    submissionIndex: 1,
    timestamp: '27/10/2026 09:05',
    versionLabel: 'mẫu v1',
    status: 'revision_requested',
    content: {
      programSchedule: `• 8h00: Khai mạc, giới thiệu Khoa và Đoàn – Hội.
• 9h00: Gian hàng câu lạc bộ, trò chơi tập thể.
• 10h00: Bế mạc.`,
    },
    reviewComment: 'Thiếu phần giao lưu cựu sinh viên, sắp lại theo giờ.',
    autoCheckSummary: {
      rulesPassed: 1,
      rulesTotal: 1,
      warnings: [],
    },
  },
];

export const INITIAL_DELEGATED_RESULTS: DelegatedFieldResult[] = [
  {
    id: 'dfr-1',
    fieldKey: 'programSchedule',
    fieldName: 'Nội dung chương trình',
    subtaskLabel: 'Giao việc #1 và #2 · 3 người',
    contributions: [
      {
        id: 'c-uy',
        contributorName: 'Lê Văn Uy',
        contributorAvatar: 'LU',
        submissionIndex: 2,
        submissionCode: 'SUB-2026-0412',
        status: 'approved',
        value: `• 8h00: Khai mạc, giới thiệu Khoa và Đoàn – Hội.
• 9h00: Gian hàng CLB, trò chơi tập thể.
• 10h30: Giao lưu cựu sinh viên; bế mạc 11h30.`,
      },
      {
        id: 'c-vy',
        contributorName: 'Phạm Thị Vy',
        contributorAvatar: 'PV',
        submissionIndex: 1,
        submissionCode: 'SUB-2026-0419',
        status: 'approved',
        value: `• 7h30: Đón tân sinh viên, check-in.
• 8h00: Khai mạc, văn nghệ chào mừng.
• 9h30: Hội trại các câu lạc bộ.`,
      },
      {
        id: 'c-quang-1',
        contributorName: 'Ngô Quang',
        contributorAvatar: 'NQ',
        submissionIndex: 1,
        submissionCode: 'SUB-2026-0422',
        status: 'pending',
        value: `• 8h00: Hoạt động mở màn.
• 9h00: Thi đấu thể thao giao hữu.`,
      },
    ],
  },
  {
    id: 'dfr-2',
    fieldKey: 'budgetDetail',
    fieldName: 'Dự trù kinh phí chi tiết',
    subtaskLabel: 'Giao việc #2 · 2 người',
    contributions: [
      {
        id: 'c-vy-budget',
        contributorName: 'Phạm Thị Vy',
        contributorAvatar: 'PV',
        submissionIndex: 1,
        submissionCode: 'SUB-2026-0420',
        status: 'approved',
        value: `Âm thanh, ánh sáng: 1.500.000đ\nTrang trí, backdrop: 900.000đ\nNước uống, quà tặng: 800.000đ`,
        summaryMeta: '3 hạng mục · tổng 3.200.000đ',
        isCurrentlyApplied: true,
      },
      {
        id: 'c-quang-budget',
        contributorName: 'Ngô Quang',
        contributorAvatar: 'NQ',
        submissionIndex: 1,
        submissionCode: 'SUB-2026-0425',
        status: 'pending',
        value: `Âm thanh: 2.000.000đ\nBackdrop: 1.100.000đ\nQuà tặng: 1.000.000đ`,
        summaryMeta: '4 hạng mục · tổng 4.100.000đ',
      },
    ],
  },
  {
    id: 'dfr-3',
    fieldKey: 'totalBudget',
    fieldName: 'Tổng kinh phí',
    subtaskLabel: 'Giao việc #2 · 2 người',
    contributions: [
      {
        id: 'c-vy-total',
        contributorName: 'Phạm Thị Vy',
        contributorAvatar: 'PV',
        submissionIndex: 1,
        submissionCode: 'SUB-2026-0420',
        status: 'approved',
        value: '3.200.000 VNĐ',
      },
      {
        id: 'c-quang-total',
        contributorName: 'Ngô Quang',
        contributorAvatar: 'NQ',
        submissionIndex: 1,
        submissionCode: 'SUB-2026-0425',
        status: 'pending',
        value: '4.100.000 VNĐ',
      },
    ],
  },
];

export const INITIAL_PROVENANCE_LOGS: ProvenanceLog[] = [
  {
    id: 'p-1',
    text: 'Bạn tự nhập "Tổng kinh phí"',
    time: '23:15 hôm nay',
    type: 'self',
  },
  {
    id: 'p-2',
    text: 'Bạn áp dụng "Dự trù kinh phí chi tiết" từ bài nộp lần 1 của Phạm Thị Vy',
    time: '23:10 hôm nay',
    code: 'SUB-2026-0420',
    type: 'apply',
  },
  {
    id: 'p-3',
    text: 'Phạm Thị Vy — bài nộp lần 1 được duyệt',
    time: '22:48 hôm nay',
    type: 'review',
  },
  {
    id: 'p-4',
    text: 'Lê Văn Uy — bài nộp lần 2 được duyệt',
    time: '22:30 hôm nay',
    type: 'review',
  },
  {
    id: 'p-5',
    text: 'Ngô Quang nộp bài lần 1',
    time: '21:02 hôm nay',
    type: 'submit',
  },
];
