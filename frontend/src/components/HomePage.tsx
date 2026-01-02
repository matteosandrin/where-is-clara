import { useCallback, useEffect, useRef, useState } from "react";
import { userApi } from "../client";
import type { User } from "../types";

export function HomePage() {
  const [users, setUsers] = useState<User[]>([]);
  const inputUsernameRef = useRef<HTMLInputElement>(null);
  const inputEmailRef = useRef<HTMLInputElement>(null);

  const fetchUsers = useCallback(async () => {
    const users = await userApi.getAll();
    setUsers(users);
  }, []);

  const handleDelete = async (id: string) => {
    await userApi.delete(id);
    fetchUsers();
  };

  const handleCreate = async () => {
    if (inputUsernameRef.current?.value && inputEmailRef.current?.value) {
      await userApi.create({
        username: inputUsernameRef.current.value,
        email: inputEmailRef.current.value,
      });
      inputUsernameRef.current.value = "";
      inputEmailRef.current.value = "";
      fetchUsers();
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return (
    <div>
      <h1>Users</h1>
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Username</th>
            <th>Email</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td>{user.id}</td>
              <td>{user.username}</td>
              <td>{user.email}</td>
              <td>
                <button onClick={() => handleDelete(user.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex flex-col gap-2 mt-4 w-xs">
        <input placeholder="Username" ref={inputUsernameRef} />
        <input placeholder="Email" ref={inputEmailRef} />
        <button type="submit" onClick={() => handleCreate()}>
          Create
        </button>
      </div>
    </div>
  );
}
