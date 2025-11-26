import Styles from "@/assets/styles/background.module.css";

export default function Background({ count }: { count: number }) {
  return (
    <div className={`${Styles.background} flex justify-center items-center`}>
      <div className={Styles.blobContainer}>
        <div className={`${Styles.blob} ${count && 'opacity-50'}`}></div>
      </div>
    </div>
  );
}
