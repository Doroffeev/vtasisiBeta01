import React from 'react';
import { BarChart, Clock, Activity, Users, ArrowUp, ArrowDown, ChevronRight } from 'lucide-react';
import StatusCard from './cards/StatusCard';
import StatisticCard from './cards/StatisticCard';
import TableRow from './ui/TableRow';

const Dashboard: React.FC = () => {
  return (
    <main className="flex-1 p-6 overflow-hidden">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Добро пожаловать, Иван</h1>
        <p className="text-gray-600">Ваш отчет и статистика на сегодняшний день</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatusCard 
          title="Активных пользователей"
          value="1,284"
          change={"+14%"}
          isPositive={true}
          icon={<Users size={20} className="text-blue-500" />}
          bgColor="bg-blue-50"
        />
        <StatusCard 
          title="Новых заказов"
          value="374"
          change={"+18%"}
          isPositive={true}
          icon={<BarChart size={20} className="text-green-500" />}
          bgColor="bg-green-50"
        />
        <StatusCard 
          title="Общий доход"
          value="₽124,763"
          change={"+27%"}
          isPositive={true}
          icon={<Activity size={20} className="text-purple-500" />}
          bgColor="bg-purple-50"
        />
        <StatusCard 
          title="Среднее время"
          value="3.5 мин"
          change={"-2%"}
          isPositive={false}
          icon={<Clock size={20} className="text-amber-500" />}
          bgColor="bg-amber-50"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm col-span-2">
          <div className="p-4 border-b flex justify-between items-center">
            <h2 className="text-lg font-medium">Статистика продаж</h2>
            <div className="flex space-x-2">
              <button className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">День</button>
              <button className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors">Неделя</button>
              <button className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors">Месяц</button>
            </div>
          </div>
          <div className="p-4">
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              График продаж (здесь будет график)
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-4 border-b">
            <h2 className="text-lg font-medium">Активность</h2>
          </div>
          <div className="p-4">
            <ul className="space-y-4">
              <li className="flex items-start">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-3 mt-1 flex-shrink-0">
                  <span className="text-blue-600 text-xs font-medium">ИП</span>
                </div>
                <div>
                  <p className="text-sm"><span className="font-medium">Иван Петров</span> добавил новый проект <span className="font-medium">«Редизайн сайта»</span></p>
                  <p className="text-xs text-gray-500 mt-1">2 часа назад</p>
                </div>
              </li>
              <li className="flex items-start">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center mr-3 mt-1 flex-shrink-0">
                  <span className="text-green-600 text-xs font-medium">АС</span>
                </div>
                <div>
                  <p className="text-sm"><span className="font-medium">Анна Смирнова</span> завершила задачу <span className="font-medium">«Верстка главной страницы»</span></p>
                  <p className="text-xs text-gray-500 mt-1">4 часа назад</p>
                </div>
              </li>
              <li className="flex items-start">
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center mr-3 mt-1 flex-shrink-0">
                  <span className="text-purple-600 text-xs font-medium">ДК</span>
                </div>
                <div>
                  <p className="text-sm"><span className="font-medium">Дмитрий Козлов</span> оставил комментарий к задаче <span className="font-medium">«Разработка API»</span></p>
                  <p className="text-xs text-gray-500 mt-1">6 часов назад</p>
                </div>
              </li>
              <li className="flex items-start">
                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center mr-3 mt-1 flex-shrink-0">
                  <span className="text-amber-600 text-xs font-medium">ЕВ</span>
                </div>
                <div>
                  <p className="text-sm"><span className="font-medium">Елена Волкова</span> обновила статус проекта <span className="font-medium">«Мобильное приложение»</span></p>
                  <p className="text-xs text-gray-500 mt-1">8 часов назад</p>
                </div>
              </li>
            </ul>
            <button className="mt-4 w-full py-2 text-blue-600 text-sm flex items-center justify-center hover:text-blue-800 transition-colors">
              Показать все <ChevronRight size={16} className="ml-1" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm col-span-2">
          <div className="p-4 border-b flex justify-between items-center">
            <h2 className="text-lg font-medium">Последние проекты</h2>
            <button className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
              Все проекты
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <th className="px-6 py-3">Название проекта</th>
                  <th className="px-6 py-3">Клиент</th>
                  <th className="px-6 py-3">Статус</th>
                  <th className="px-6 py-3">Завершено</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <TableRow 
                  name="Редизайн корпоративного сайта"
                  client="ООО Инновации"
                  status="В работе"
                  statusColor="bg-blue-100 text-blue-800"
                  completion={65}
                />
                <TableRow 
                  name="Мобильное приложение"
                  client="Старт Технологии"
                  status="Завершен"
                  statusColor="bg-green-100 text-green-800"
                  completion={100}
                />
                <TableRow 
                  name="Интеграция CRM-системы"
                  client="Группа Альфа"
                  status="Отложен"
                  statusColor="bg-amber-100 text-amber-800"
                  completion={35}
                />
                <TableRow 
                  name="Разработка API"
                  client="ТехноСофт"
                  status="В работе"
                  statusColor="bg-blue-100 text-blue-800"
                  completion={80}
                />
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg shadow-sm overflow-hidden">
          <div className="p-6 text-white">
            <h2 className="text-xl font-semibold mb-4">Статистика за месяц</h2>
            <div className="space-y-4">
              <StatisticCard 
                title="Выручка"
                value="₽485,290"
                change="+12.3%"
                isPositive={true}
              />
              <StatisticCard 
                title="Новые клиенты"
                value="45"
                change="+23.5%"
                isPositive={true}
              />
              <StatisticCard 
                title="Проектов завершено"
                value="12"
                change="+8.2%"
                isPositive={true}
              />
              <StatisticCard 
                title="Средний чек"
                value="₽42,500"
                change="-2.4%"
                isPositive={false}
              />
            </div>
            <button className="mt-6 w-full bg-white bg-opacity-20 text-white py-2 rounded-md hover:bg-opacity-30 transition-colors text-sm">
              Подробный отчет
            </button>
          </div>
        </div>
      </div>
    </main>
  );
};

export default Dashboard;