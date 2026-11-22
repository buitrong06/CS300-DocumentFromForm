export interface SubtaskDelegation {
  title: string;
  selectedFieldKeys: string[];
  recipients: { id: string; name: string; avatar: string }[];
  deadline: string;
  readOnlyContextKeys: string[];
  instructions: string;
}
