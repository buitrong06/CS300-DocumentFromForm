export interface ExtractedFieldItem {
  id: string;
  label: string;
  type: 'short_text' | 'number' | 'date' | 'long_text';
  typeLabel: string;
  confidence: string;
  status: 'approved' | 'review';
  required: boolean;
  maxLength?: number;
  instruction: string;
  sourceSpan: string;
}

export interface FillDocumentValues {
  fullName: string;
  nationalId: string;
  birthDate: string;
  mainContent: string;
}

export const INITIAL_EXTRACTED_FIELDS: ExtractedFieldItem[] = [
  {
    id: 'org_name',
    label: 'Tên Cá nhân / Tổ chức',
    type: 'short_text',
    typeLabel: 'Văn bản ngắn',
    confidence: '0,88',
    status: 'approved',
    required: true,
    instruction: 'Ghi đầy đủ tên cá nhân hoặc tổ chức đăng ký.',
    sourceSpan: '6.1. Tên Cá nhân / Tổ chức: ...........................',
  },
  {
    id: 'full_name',
    label: 'Họ và tên',
    type: 'short_text',
    typeLabel: 'Văn bản ngắn',
    confidence: '0,99',
    status: 'approved',
    required: true,
    instruction: 'Nhập họ và tên theo CCCD.',
    sourceSpan: '7.1. Họ và tên: ........................................',
  },
  {
    id: 'national_id',
    label: 'Số định danh cá nhân',
    type: 'number',
    typeLabel: 'Số',
    confidence: '0,92',
    status: 'review',
    required: true,
    maxLength: 12,
    instruction: 'Nhập đủ 12 chữ số trên CCCD.',
    sourceSpan: 'Số định danh cá nhân:  □ □ □ □ □ □ □ □ □ □ □ □',
  },
  {
    id: 'birth_date',
    label: 'Ngày, tháng, năm sinh',
    type: 'date',
    typeLabel: 'Ngày',
    confidence: '0,72',
    status: 'review',
    required: true,
    instruction: 'Định dạng DD/MM/YYYY.',
    sourceSpan: 'Ngày, tháng, năm sinh: ....... / ....... / .......',
  },
];

export const INITIAL_FILL_VALUES: FillDocumentValues = {
  fullName: 'Nguyễn Minh Anh',
  nationalId: '079204001234',
  birthDate: '24/10/2002',
  mainContent: '',
};
