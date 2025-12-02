# Property Update Debugging Guide

## 🔍 How to Debug Property Update Issues

If property updates are not working, follow these steps to identify the issue:

---

## Step 1: Check Backend Logs

The backend now has comprehensive logging. Check your logs for:

### Initial Request Log
```
Update property request received: {
  propertyId: "...",
  bodyKeys: [...],
  bodySample: {...},
  hasFiles: true/false,
  fileCount: 0,
  filesType: "array" | "object" | "none"
}
```

**What to check:**
- Are `bodyKeys` showing the fields you're sending?
- Is `hasFiles` true if you're uploading photos?
- Is `fileCount` correct?

### Existing Photos Log
```
Found existingPhotos[]: { count: X }
Final existingPhotosArray: { count: X, photos: [...] }
```

**What to check:**
- Is `count` > 0 if you're sending existing photos?
- Are the photo URLs correct?

### Update Data Log
```
Update data prepared: {
  updateKeys: [...],
  updateDataSample: {...}
}
```

**What to check:**
- Are all the fields you're updating in `updateKeys`?
- Are the values correct in `updateDataSample`?

### Success/Error Log
```
Property updated successfully: {
  propertyId: "...",
  updatedFields: [...],
  resultHasPhotos: true/false,
  resultPhotoCount: X
}
```

**What to check:**
- Did the update succeed?
- Are the updated fields correct?
- Are photos included?

---

## Step 2: Check Frontend Request

### Browser DevTools → Network Tab

1. Find the PUT request to `/api/properties/:id`
2. Click on it
3. Check **Headers**:
   - `Content-Type` should be `multipart/form-data; boundary=...`
   - `Authorization` should have `Bearer YOUR_TOKEN`

4. Check **Payload** (Form Data):
   - Are all fields present?
   - Are nested fields using bracket notation? (`price[rent_monthly]`, not `price.rent_monthly`)
   - Are arrays using `[]` notation? (`amenities[]`, `existingPhotos[]`)

### Example of Correct FormData:

```
name: "Updated Property"
size: "1500"
furnishing: "Full"
price[rent_monthly]: "30000"
address[city]: "Bangalore"
amenities[]: "wifi"
amenities[]: "gym"
existingPhotos[]: "https://cloudinary.com/photo1.jpg"
existingPhotos[]: "https://cloudinary.com/photo2.jpg"
photos: [File object]
photos: [File object]
```

---

## Step 3: Common Issues & Solutions

### Issue 1: "Property not found"
**Symptoms:** 404 error
**Causes:**
- Wrong property ID
- Property doesn't exist
- ID format is incorrect

**Solution:**
- Verify the property ID in the URL
- Check that the property exists in the database
- Ensure ID is a valid MongoDB ObjectId

### Issue 2: Fields not updating
**Symptoms:** Request succeeds but fields don't change
**Causes:**
- Field names don't match backend expectations
- Values are empty strings (backend ignores them)
- Nested objects not using bracket notation

**Solution:**
- Use exact field names: `building_type` not `buildingType`
- Use bracket notation: `price[rent_monthly]` not `price.rent_monthly`
- Don't send empty strings for fields you want to keep unchanged

### Issue 3: Photos not updating
**Symptoms:** Photos don't change or get deleted incorrectly
**Causes:**
- `existingPhotos[]` not sent correctly
- Photo URLs don't match exactly
- Multer not parsing arrays correctly

**Solution:**
- Always send `existingPhotos[]` with URLs you want to KEEP
- Send each URL separately: `formData.append('existingPhotos[]', url)`
- Check logs to see if URLs are being parsed correctly

### Issue 4: Validation errors
**Symptoms:** 400 error with validation message
**Causes:**
- Enum values don't match (case-sensitive)
- Invalid data types
- Required fields missing (shouldn't happen for updates)

**Solution:**
- Check enum values: `'Covered'` not `'covered'` or `'COVERED'`
- Ensure numbers are sent as strings (FormData converts them)
- Check backend logs for specific validation errors

### Issue 5: Request timeout
**Symptoms:** Request hangs or times out
**Causes:**
- Photo upload too large
- Network issues
- Backend processing taking too long

**Solution:**
- Check photo file sizes (max 5MB each)
- Check network connection
- Check backend logs for processing time

---

## Step 4: Test with Minimal Data

Try updating with just one field to isolate the issue:

```javascript
const formData = new FormData();
formData.append('name', 'Test Update');

const response = await fetch(`/api/properties/${propertyId}`, {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});
```

If this works, gradually add more fields to find which one causes the issue.

---

## Step 5: Test Photo Updates Separately

### Test 1: Keep all photos, add new ones
```javascript
const formData = new FormData();
formData.append('name', 'Updated Name');

// Don't send existingPhotos[] - all photos will be kept
const fileInput = document.querySelector('input[type="file"]');
for (let file of fileInput.files) {
  formData.append('photos', file);
}
```

### Test 2: Remove some photos, keep others
```javascript
const formData = new FormData();
formData.append('name', 'Updated Name');

// Send only the URLs you want to KEEP
photosToKeep.forEach(url => {
  formData.append('existingPhotos[]', url);
});
```

### Test 3: Remove all photos
```javascript
const formData = new FormData();
formData.append('name', 'Updated Name');

// Send empty array
formData.append('existingPhotos[]', JSON.stringify([]));
// OR don't send existingPhotos[] at all and send empty array in photos
```

---

## Step 6: Check Backend Response

### Successful Update Response:
```json
{
  "_id": "...",
  "name": "Updated Property",
  "photos": ["url1", "url2"],
  "updatedAt": "2025-01-01T00:00:00.000Z",
  ...
}
```

### Error Response:
```json
{
  "message": "Error updating property",
  "error": "Specific error message"
}
```

Check the `error` field for details.

---

## Step 7: Enable Detailed Logging

If you need even more detail, you can temporarily add console.logs in the frontend:

```javascript
// Before sending request
console.log('FormData contents:');
for (let [key, value] of formData.entries()) {
  console.log(key, value);
}

// After receiving response
console.log('Response:', response);
console.log('Response data:', await response.json());
```

---

## 🐛 Quick Debug Checklist

- [ ] Property ID is correct and valid
- [ ] Authorization token is valid and included
- [ ] Content-Type is NOT manually set (browser handles it)
- [ ] Using FormData (not JSON)
- [ ] Field names match backend exactly
- [ ] Enum values are case-sensitive correct
- [ ] Nested objects use bracket notation
- [ ] Arrays use `[]` notation
- [ ] `existingPhotos[]` contains URLs to KEEP (not delete)
- [ ] Photo files are under 5MB each
- [ ] Backend logs show the request was received
- [ ] Backend logs show update was successful

---

## 📞 Still Not Working?

If you've checked everything above and it's still not working:

1. **Share the backend logs** - Copy the full log output from the update attempt
2. **Share the network request** - Screenshot of the Network tab showing:
   - Request URL
   - Request Headers
   - Request Payload (Form Data)
   - Response
3. **Share the frontend code** - The exact code you're using to send the update request

This will help identify the exact issue.

