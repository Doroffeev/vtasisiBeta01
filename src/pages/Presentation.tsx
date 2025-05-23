import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const Presentation: React.FC = () => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      title: "Ветеринарный ассистент",
      subtitle: "Система управления животноводством",
      description: "Комплексное решение для управления поголовьем скота",
      image: "https://images.pexels.com/photos/735968/pexels-photo-735968.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
      features: [
        "Учет животных",
        "Ветеринарные операции",
        "Мониторинг здоровья",
        "Отчетность"
      ]
    },
    {
      title: "Учет животных",
      description: "Полный контроль над поголовьем",
      image: "https://images.pexels.com/photos/422218/pexels-photo-422218.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
      features: [
        "Карточки животных",
        "Группировка по категориям",
        "История перемещений",
        "Отслеживание статуса"
      ]
    },
    {
      title: "Ветеринарные операции",
      description: "Управление здоровьем стада",
      image: "https://images.pexels.com/photos/7468812/pexels-photo-7468812.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
      features: [
        "Планирование осмотров",
        "Учет вакцинаций",
        "История лечения",
        "Контроль медикаментов"
      ]
    },
    {
      title: "Мониторинг и аналитика",
      description: "Анализ показателей стада",
      image: "https://images.pexels.com/photos/7468754/pexels-photo-7468754.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
      features: [
        "Статистика здоровья",
        "Продуктивность",
        "Динамика роста",
        "Прогнозирование"
      ]
    }
  ];

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="relative bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Navigation buttons */}
          <button
            onClick={prevSlide}
            className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 bg-white/80 p-2 rounded-full shadow-lg hover:bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Предыдущий слайд"
          >
            <ChevronLeft className="h-6 w-6 text-gray-800" />
          </button>
          <button
            onClick={nextSlide}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10 bg-white/80 p-2 rounded-full shadow-lg hover:bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Следующий слайд"
          >
            <ChevronRight className="h-6 w-6 text-gray-800" />
          </button>

          {/* Slide content */}
          <div className="grid grid-cols-1 lg:grid-cols-2">
            {/* Image section */}
            <div className="relative h-64 lg:h-[600px]">
              <img
                src={slides[currentSlide].image}
                alt={slides[currentSlide].title}
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            </div>

            {/* Content section */}
            <div className="p-8 lg:p-12 flex flex-col justify-center">
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                {slides[currentSlide].title}
              </h2>
              {slides[currentSlide].subtitle && (
                <p className="text-xl text-gray-600 mb-6">{slides[currentSlide].subtitle}</p>
              )}
              <p className="text-lg text-gray-700 mb-8">{slides[currentSlide].description}</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {slides[currentSlide].features.map((feature, index) => (
                  <div
                    key={index}
                    className="bg-gray-50 p-4 rounded-lg border border-gray-100 hover:shadow-md hover:border-blue-100 transition-all duration-300"
                  >
                    <p className="text-gray-800">{feature}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Slide indicators */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  currentSlide === index ? 'bg-blue-600 w-6' : 'bg-gray-300 hover:bg-gray-400'
                }`}
                aria-label={`Перейти к слайду ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Presentation;