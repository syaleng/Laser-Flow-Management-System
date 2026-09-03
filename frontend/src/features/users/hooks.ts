import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createUser, getUsers, resetUserPassword, setUserActive, updateUser } from "./api";

const key = ["users"] as const;
export function useUsers() { return useQuery({ queryKey: key, queryFn: getUsers }); }
export function useUserMutations() {
  const client = useQueryClient(); const refresh = () => client.invalidateQueries({ queryKey: key });
  return {
    create: useMutation({ mutationFn: createUser, onSuccess: refresh }),
    update: useMutation({ mutationFn: ({ id, input }: { id: string; input: Parameters<typeof updateUser>[1] }) => updateUser(id, input), onSuccess: refresh }),
    active: useMutation({ mutationFn: ({ id, active }: { id: string; active: boolean }) => setUserActive(id, active), onSuccess: refresh }),
    password: useMutation({ mutationFn: ({ id, password }: { id: string; password: string }) => resetUserPassword(id, password) }),
  };
}
