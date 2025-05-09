import React from 'react';

function DashboardNumbers({ list=[] }) {
  return (
    <>
        {
            list.map((item) => (
                <div key={item.id} className="bg-gradient-to-r from-blue-500 to-blue-700 text-white shadow-lg rounded-lg p-6 flex flex-col items-center">
                    <h3 className="text-xl font-bold mb-2">{item.name}</h3>
                    <p className="text-4xl font-extrabold">{item.value}</p>
                </div>
            ))
        }
    </>
  )
}

export default DashboardNumbers;