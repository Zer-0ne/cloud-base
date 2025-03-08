'use client'
import { createData, deleteData } from "@/utils/fetch-from-api";

const ApiContainer = ({ serverKey }: { serverKey: string }) => {
    const handleCopy = () => {
        // 'user server'
        if (serverKey) {
            navigator.clipboard.writeText(serverKey)
                .then(() => {
                    // Optionally, you can show a success message or feedback
                    alert('API key copied to clipboard!');
                })
                .catch(err => {
                    console.error('Failed to copy: ', err);
                });
        }
    };

    const handleCreateApiKey = async () => {
        // return await createData({ name: 'sahil' })
    }

    const handleRevokeKey = async () => {
        // return await deleteData({ token: serverKey })
    }
    return (
        <div className="bg-dark-cardBg gap-2 flex flex-col rounded-md content-center p-3 px-4 container m-2 shadow-2xl  max-w-[1100px]">
            <h2 className="font-bold text-2xl opacity-90">Drive</h2>

            {/* API key container */}
            <div className="flex gap-5 relative flex-wrap justify-stretch items-stretch">
                {!serverKey && (
                    <div
                        className="absolute opacity-95 inset-0 flex flex-1 justify-center items-center z-[1] backdrop-blur rounded border-dotted border-[2px] border-[#ffffff53] shadow-md bg-[#0000005e]"
                    >
                        <button onClick={handleCreateApiKey} className="opacity-70">Add Api key</button>
                    </div>
                )}
                <div className="flex flex-[7] basis-[700px] gap-2 justify-between bg-dark-inputContainerbg overflow-hidden shadow-md rounded-lg">
                    <div
                        onClick={handleCopy}
                        className="flex  flex-[2] w-[94%] max-w-[95%] bg-dark-inputBg rounded-lg shadow-lg h-full p-2 py-2"
                    >
                        <p className="text-lg cursor-pointer truncate opacity-70">{serverKey}</p>
                    </div>
                    <button onClick={handleCopy} className="content-center flex-1 text-center">copy</button>
                </div>

                {/* Revoke btn */}
                <div className="flex-1 p-2 basis-[100px] shadow border-[2px] flex justify-center items-center text-[#ff0000d7] rounded border-[#ff00002d]">
                    <button onClick={handleRevokeKey}>Revoke key</button>
                </div>
            </div>
        </div>
    );
};

export default ApiContainer;
