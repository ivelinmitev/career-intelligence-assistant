import { CareerWorkspace } from "@/app/career-workspace";
import { sampleJobs, sampleResume } from "@/src/data";

export default function HomePage() {
  return <CareerWorkspace resume={sampleResume} jobs={sampleJobs} />;
}
