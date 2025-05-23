import React, { useState } from 'react';
import { Plus, Search, UserCheck, UserX } from 'lucide-react';
import { useEmployees, EmployeeRole, roleLabels } from '../contexts/EmployeesContext';
import { useUser } from '../contexts/UserContext'; // Импортируем контекст пользователя

const Employees: React.FC = () => {
  const { employees, addEmployee, toggleEmployeeStatus } = useEmployees();
  const { user } = useUser(); // Получаем текущего пользователя
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    fullName: '',
    position: 'VET' as EmployeeRole
  });

  // Проверяем, имеет ли пользователь права на добавление сотрудников
  const hasPermission = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    
    // Проверяем права пользователя перед добавлением сотрудника
    if (!hasPermission) {
      setFormError('Недостаточно прав для добавления сотрудника. Требуется роль ADMIN или MANAGER');
      return;
    }
    
    try {
      await addEmployee({
        fullName: formData.fullName,
        position: formData.position,
        isActive: true
      });
      setShowForm(false);
      setFormData({
        fullName: '',
        position: 'VET'
      });
    } catch (error) {
      if (error instanceof Error) {
        setFormError(error.message);
      } else {
        setFormError('Произошла ошибка при добавлении сотрудника');
      }
    }
  };

  const filteredEmployees = employees.filter(employee =>
    employee.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    roleLabels[employee.position].toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Сотрудники</h1>
        <button
          onClick={() => setShowForm(true)}
          className={`${
            hasPermission 
              ? "bg-blue-600 hover:bg-blue-700" 
              : "bg-gray-400 cursor-not-allowed"
          } text-white px-4 py-2 rounded-md flex items-center`}
          disabled={!hasPermission}
          title={!hasPermission ? "Недостаточно прав для добавления сотрудника" : ""}
        >
          <Plus size={20} className="mr-2" />
          Добавить сотрудника
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Добавить сотрудника</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {formError && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
                  {formError}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700">ФИО</label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Должность</label>
                <select
                  name="position"
                  value={formData.position}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                >
                  {Object.entries(roleLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setFormError(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 ${
                    hasPermission 
                      ? "bg-blue-600 hover:bg-blue-700" 
                      : "bg-gray-400 cursor-not-allowed"
                  } text-white rounded-md`}
                  disabled={!hasPermission}
                >
                  Сохранить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white shadow rounded-lg">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Поиск по ФИО, должности..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ФИО</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Должность</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Статус</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Действия</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredEmployees.map(employee => (
                <tr key={employee.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{employee.fullName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {roleLabels[employee.position]}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      employee.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {employee.isActive ? 'Активен' : 'Заблокирован'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {hasPermission && (
                      <button
                        onClick={() => toggleEmployeeStatus(employee.id)}
                        className={`${
                          employee.isActive ? 'text-red-600 hover:text-red-800' : 'text-green-600 hover:text-green-800'
                        }`}
                        title={employee.isActive ? 'Заблокировать' : 'Активировать'}
                      >
                        {employee.isActive ? <UserX size={18} /> : <UserCheck size={18} />}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Employees;