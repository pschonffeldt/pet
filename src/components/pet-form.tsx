export default function PetForm() {
  return (
    <form>
      <label for="name">Enter your name: </label>
      <input type="text" name="name" id="name" required />
    </form>
  );
}
