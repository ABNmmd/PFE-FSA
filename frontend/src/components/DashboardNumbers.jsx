import React from 'react';

function DashboardNumbers({ list=[] }) {
  return (
    <>
        {
            list.map((item) => (
                <div key={item.id} className="bg-white shadow-md rounded-md p-4">
                    <h3 className="text-lg font-semibold">{item.name}</h3>
                    <p className="text-gray-700">{item.value}</p>
                </div>
            ))
        }
    </>
  )
}

export default DashboardNumbers;