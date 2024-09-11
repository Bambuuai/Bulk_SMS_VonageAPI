const Social = () => {
  return (
    <>
      <ul className="flex gap-6 justify-center">
        <li className="">
          <a
            href="#"
            className="inline-flex h-10 w-10 bg-[#395599] text-white text-2xl flex-col items-center justify-center rounded-full"
          >
            <img src="/assets/images/icon/fb.svg" alt="" />
          </a>
        </li>
        <li className="">
          <a
            href="#"
            className="inline-flex h-10 w-10 bg-[#EA4335] text-white text-2xl flex-col items-center justify-center rounded-full"
          >
            <img src="/assets/images/icon/gp.svg" alt="" />
          </a>
        </li>
      </ul>
    </>
  );
};

export default Social;
