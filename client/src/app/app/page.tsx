import type { Metadata } from "next";
import { ProjectList } from "@/features/workspace/components/ProjectList";

export const metadata: Metadata = {
  title: "Projects — Attack Surface Studio",
};

export default function AppHomePage() {
  return <ProjectList />;
}
