"use client";

import React from 'react';

export default function Loading() {
    return (
        <div className="flex flex-col min-h-screen bg-gray-50 p-4 md:p-8 animate-pulse">
            {/* Header Skeleton */}
            <div className="flex justify-between items-center mb-8">
                <div className="h-8 w-48 bg-gray-200 rounded"></div>
                <div className="h-10 w-24 bg-gray-200 rounded-full"></div>
            </div>

            {/* Hero Skeleton (Mobile) */}
            <div className="md:hidden h-40 w-full bg-gray-200 rounded-2xl mb-6"></div>

            {/* Grid Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <div className="flex justify-between mb-4">
                            <div className="h-6 w-16 bg-gray-100 rounded"></div>
                            <div className="h-6 w-20 bg-gray-100 rounded"></div>
                        </div>
                        <div className="h-8 w-full bg-gray-200 rounded mb-4"></div>
                        <div className="flex gap-2 mb-6">
                            <div className="h-5 w-12 bg-gray-50 rounded"></div>
                            <div className="h-5 w-12 bg-gray-50 rounded"></div>
                        </div>
                        <div className="flex justify-between items-center">
                            <div className="h-4 w-24 bg-gray-100 rounded"></div>
                            <div className="h-9 w-24 bg-gray-200 rounded-xl"></div>
                        </div>
                    </div>
                ))}
            </div>

            <style jsx>{`
        .animate-pulse {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: .5; }
        }
      `}</style>
        </div>
    );
}
