import { Column, TaskCard, User, TaskLabel } from "./types";

// Mock users
export const mockUsers: User[] = [
  { id: "1", name: "Alice Johnson", initials: "AJ" },
  { id: "2", name: "Bob Smith", initials: "BS" },
  { id: "3", name: "Carol Davis", initials: "CD" },
  { id: "4", name: "David Wilson", initials: "DW" },
  { id: "5", name: "Eva Brown", initials: "EB" },
];

// Mock labels
export const mockLabels: TaskLabel[] = [
  { id: "1", name: "Frontend", color: "bg-blue-500" },
  { id: "2", name: "Backend", color: "bg-green-500" },
  { id: "3", name: "Design", color: "bg-pink-500" },
  { id: "4", name: "Bug", color: "bg-red-500" },
  { id: "5", name: "Feature", color: "bg-purple-500" },
  { id: "6", name: "Research", color: "bg-yellow-500" },
];

// Mock cards
export const mockCards: TaskCard[] = [
  // To Do Column
  {
    id: "1",
    title:
      "Design system and component library setup for the new project management platform",
    status: "todo",
    labels: [mockLabels[0], mockLabels[2]],
    assignees: [mockUsers[0], mockUsers[1]],
    attachments: 2,
    dueDate: "2024-07-22",
  },
  {
    id: "2",
    title: "User research and persona development",
    status: "todo",
    labels: [mockLabels[5]],
    assignees: [mockUsers[2], mockUsers[3]],
    comments: 3,
  },
  {
    id: "3",
    title: "API endpoint documentation",
    status: "todo",
    labels: [mockLabels[1]],
    assignees: [mockUsers[4]],
    attachments: 1,
    dueDate: "2024-09-29",
  },

  // Doing Column
  {
    id: "4",
    title: "Implement responsive navigation component with mobile menu",
    status: "doing",
    progress: 75,
    labels: [mockLabels[0]],
    assignees: [mockUsers[1], mockUsers[0]],
    comments: 4,
    dueDate: "2024-07-15",
  },
  {
    id: "5",
    title: "Database optimization and query performance improvements",
    status: "doing",
    progress: 45,
    labels: [mockLabels[1]],
    assignees: [mockUsers[3], mockUsers[4]],
    comments: 3,
    attachments: 2,
  },
  {
    id: "6",
    title: "User authentication flow redesign",
    status: "doing",
    labels: [mockLabels[2], mockLabels[0]],
    assignees: [mockUsers[2]],
    attachments: 1,
  },

  // Done Column
  {
    id: "7",
    title: "Landing page design and development completed",
    status: "done",
    progress: 100,
    labels: [mockLabels[0], mockLabels[2]],
    assignees: [mockUsers[0], mockUsers[1], mockUsers[2]],
    comments: 2,
    dueDate: "2024-06-16",
  },
  {
    id: "8",
    title: "Team collaboration and communication improvements",
    status: "done",
    progress: 100,
    labels: [mockLabels[4]],
    assignees: [mockUsers[3], mockUsers[4], mockUsers[0], mockUsers[1]],
    comments: 6,
    dueDate: "2024-05-31",
  },
  {
    id: "9",
    title: "Code review and testing procedures established",
    status: "done",
    progress: 100,
    labels: [mockLabels[1]],
    assignees: [mockUsers[2], mockUsers[4], mockUsers[3]],
    comments: 4,
  },
];

// Mock columns
export const mockColumns: Column[] = [
  {
    id: "todo",
    title: "To do",
    cards: mockCards.filter((card) => card.status === "todo"),
  },
  {
    id: "doing",
    title: "Doing",
    cards: mockCards.filter((card) => card.status === "doing"),
  },
  {
    id: "done",
    title: "Done",
    cards: mockCards.filter((card) => card.status === "done"),
  },
];
