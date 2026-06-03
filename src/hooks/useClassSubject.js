import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { resolveSubjectFromGroup, ensureGroupSubjectDefaults } from "@/lib/subject-resolver";

export function useClassSubject(classId) {
  const classQuery = useQuery({
    queryKey: ["class", classId],
    queryFn: () => base44.entities.ClassGroup.get(classId),
    enabled: !!classId,
  });

  const classGroup = classQuery.data ? ensureGroupSubjectDefaults(classQuery.data) : null;
  const subject = resolveSubjectFromGroup(classGroup);

  return {
    classGroup,
    subject,
    isLoading: classQuery.isLoading,
    error: classQuery.error,
    refetch: classQuery.refetch,
  };
}
