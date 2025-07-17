export interface Branch {
  id: string;
  name: string;
  description: string;
  children: Branch[];
}

export interface Trunk {
  id: string;
  name: string;
  branches: Branch[];
}

export interface Thread {
  id: string;
  title: string;
  trunk: Trunk; 
}
