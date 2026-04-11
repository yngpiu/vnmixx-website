'use client';

import type { EmployeeListItem } from '@/lib/types/employee';
import { createContext, useContext, type ReactNode } from 'react';

type EmployeesTableActionsContextValue = {
  openEmployeeDetail: (employee: EmployeeListItem) => void;
  openEditRoles: (employee: EmployeeListItem) => void;
  openToggleActive: (employee: EmployeeListItem) => void;
  openDeleteEmployee: (employee: EmployeeListItem) => void;
  openRestoreEmployee: (employee: EmployeeListItem) => void;
};

const EmployeesTableActionsContext = createContext<EmployeesTableActionsContextValue | null>(null);

export function EmployeesTableActionsProvider({
  children,
  openEmployeeDetail,
  openEditRoles,
  openToggleActive,
  openDeleteEmployee,
  openRestoreEmployee,
}: {
  children: ReactNode;
  openEmployeeDetail: (employee: EmployeeListItem) => void;
  openEditRoles: (employee: EmployeeListItem) => void;
  openToggleActive: (employee: EmployeeListItem) => void;
  openDeleteEmployee: (employee: EmployeeListItem) => void;
  openRestoreEmployee: (employee: EmployeeListItem) => void;
}) {
  return (
    <EmployeesTableActionsContext.Provider
      value={{
        openEmployeeDetail,
        openEditRoles,
        openToggleActive,
        openDeleteEmployee,
        openRestoreEmployee,
      }}
    >
      {children}
    </EmployeesTableActionsContext.Provider>
  );
}

export function useEmployeesTableActions(): EmployeesTableActionsContextValue {
  const ctx = useContext(EmployeesTableActionsContext);
  if (!ctx) {
    throw new Error('useEmployeesTableActions chỉ dùng trong EmployeesTableActionsProvider.');
  }
  return ctx;
}
