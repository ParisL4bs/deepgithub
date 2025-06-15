export interface User {
  id: string;
  name: string;
  avatar?: string;
  initials: string;
}

export interface TaskCard {
  id: string;
  title: string;
  description?: string;
  progress?: number;
  dueDate?: string;
  attachments?: number;
  comments?: number;
  assignees: User[];
  labels: TaskLabel[];
  status: "todo" | "doing" | "done";
}

export interface TaskLabel {
  id: string;
  name: string;
  color: string;
}

export interface Column {
  id: string;
  title: string;
  cards: TaskCard[];
}
